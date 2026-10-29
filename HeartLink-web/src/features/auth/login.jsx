import { useState, useEffect, useRef, useId } from "react";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Check,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { apiFetch } from "../../api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  focusRing,
  inputBase,
  inputState,
  labelText,
  primaryButton,
  secondaryButton,
  textLink,
} from "./authStyles";

// ─── Validation Schemas ───────────────────────────────────────────────────────
const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

const twoFASchema = z.object({
  code: z
    .string()
    .min(6, "Enter all 6 digits of the code.")
    .max(6, "The code is 6 digits.")
    .regex(/^\d+$/, "The code can only contain numbers."),
});

// ─── User-Friendly Error Mapper ───────────────────────────────────────────────
function mapAuthError(error) {
  const status = error?.status;
  const detail = typeof error?.data?.detail === "string" ? error.data.detail : "";

  if (
    status === 401 ||
    detail.toLowerCase().includes("invalid credential") ||
    detail.toLowerCase().includes("invalid login")
  ) {
    return {
      title: "Email, username or password is incorrect",
      message: "Check both fields and try again. Passwords are case-sensitive.",
    };
  }
  if (
    status === 403 ||
    detail.toLowerCase().includes("access denied") ||
    detail.toLowerCase().includes("portal is strictly")
  ) {
    return {
      title: "This account can't use the admin portal",
      message:
        "The portal is for administrators and medical experts. Patients sign in through the HeartLink mobile app.",
    };
  }
  if (status === 429 || detail.toLowerCase().includes("rate limit") || detail.toLowerCase().includes("too many")) {
    return {
      title: "Too many sign-in attempts",
      message: "Wait a minute, then try again.",
    };
  }
  if (detail.toLowerCase().includes("disabled") || detail.toLowerCase().includes("deactivated")) {
    return {
      title: "This account is deactivated",
      message: "Ask your system administrator to reactivate it.",
    };
  }
  if (!status || status >= 500 || detail.toLowerCase().includes("network") || detail.toLowerCase().includes("fetch")) {
    return {
      title: "Can't reach HeartLink",
      message: "Check your internet connection and try again.",
    };
  }
  return {
    title: "Sign-in failed",
    message: detail || "Try again. If it keeps happening, contact your system administrator.",
  };
}

// ─── HeartLink Official Two-Facet Brand Emblem ───────────────────────────────
const EMBLEM_PATHS = [
  "M -79.20,-25.46 L -96.17,-42.43 A 38 38 0 0 1 -42.43,-96.17 L 28.28,-25.46",
  "M 25.46,-79.20 L 42.43,-96.17 A 38 38 0 0 1 96.17,-42.43 L 25.46,28.28",
  "M -25.46,79.20 L -42.43,96.17 A 38 38 0 0 1 -96.17,42.43 L -25.46,-28.28",
  "M 79.20,25.46 L 96.17,42.43 A 38 38 0 0 1 42.43,96.17 L -28.28,25.46",
];

export function HeartLogoIcon({ size = 26, className = "" }) {
  // Unique gradient ids per instance: a duplicate id inside a hidden copy breaks the visible one.
  const uid = useId().replace(/:/g, "");
  const gid = (name) => `${name}-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-132 -132 264 264"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
      aria-label="HeartLink icon"
    >
      <defs>
        <linearGradient id={gid("hl-topright")} gradientUnits="userSpaceOnUse" x1="0" y1="-122" x2="0" y2="30">
          <stop offset="0" stopColor="#2B84FF" />
          <stop offset="0.30" stopColor="#2E8DF5" />
          <stop offset="0.52" stopColor="#38B3B5" />
          <stop offset="0.68" stopColor="#5CC974" />
          <stop offset="0.81" stopColor="#B2D65A" />
          <stop offset="0.91" stopColor="#F7A63C" />
          <stop offset="1" stopColor="#FF9A2E" />
        </linearGradient>
        <linearGradient id={gid("hl-bottomleft")} gradientUnits="userSpaceOnUse" x1="0" y1="-30" x2="0" y2="122">
          <stop offset="0" stopColor="#2B87FF" />
          <stop offset="0.45" stopColor="#2A86F5" />
          <stop offset="0.62" stopColor="#2D9BE0" />
          <stop offset="0.78" stopColor="#30BE9C" />
          <stop offset="1" stopColor="#33CC82" />
        </linearGradient>
        <linearGradient id={gid("hl-bottomright")} gradientUnits="userSpaceOnUse" x1="122" y1="0" x2="-32" y2="0">
          <stop offset="0" stopColor="#3FC98A" />
          <stop offset="0.30" stopColor="#7ACD68" />
          <stop offset="0.50" stopColor="#B6D85A" />
          <stop offset="0.70" stopColor="#C2D857" />
          <stop offset="0.85" stopColor="#F2A93C" />
          <stop offset="1" stopColor="#FF9A2E" />
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
        <path d={EMBLEM_PATHS[0]} stroke="#FF4B4B" />
        <path d={EMBLEM_PATHS[1]} stroke={`url(#${gid("hl-topright")})`} />
        <path d={EMBLEM_PATHS[2]} stroke={`url(#${gid("hl-bottomleft")})`} />
        <path d={EMBLEM_PATHS[3]} stroke={`url(#${gid("hl-bottomright")})`} />
      </g>
    </svg>
  );
}

// Preserved as a clean no-op export for backwards compatibility; Cal.com uses flat/soft surfaces without neon glows.
export function LoginBackdrop() {
  return null;
}

const compactPrimaryButton = primaryButton.replace("w-full", "px-5");

const stepTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: "easeIn" } },
};

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 font-cal-sans text-[13px] font-medium text-cal-error">
      <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-[10px] border border-cal-error/30 bg-cal-surface-card px-4 py-3.5 font-cal-sans text-[14px] leading-snug"
    >
      <AlertTriangle size={18} className="mt-px shrink-0 text-cal-error" aria-hidden="true" />
      <div>
        <p className="m-0 font-semibold text-cal-ink">{error.title}</p>
        <p className="mt-1 mb-0 leading-normal text-cal-body">{error.message}</p>
      </div>
    </div>
  );
}

// ─── Forgot Password Modal (Cal.com Dialog Spec) ─────────────────────────────
function ForgotPasswordModal({ isOpen, onClose }) {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || isSubmitting || cooldown > 0) return;

    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
    } catch {
      // Same outcome either way so the form never reveals whether an account exists.
    } finally {
      setSubmitted(true);
      setCooldown(60);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cal-ink/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative w-full max-w-[420px] rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 font-cal-sans text-cal-ink shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted active:bg-cal-surface-soft ${focusRing}`}
        >
          <X size={16} />
        </button>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <h3
              id="forgot-password-title"
              className="m-0 pr-10 font-cal-sans text-[18px] font-semibold leading-[1.4] text-cal-ink"
            >
              Reset your password
            </h3>
            <p className="mt-1.5 mb-0 text-[14px] leading-[1.5] text-cal-muted">
              Enter the email or username on your staff account and we&apos;ll send instructions to
              reset your password.
            </p>

            <label htmlFor="recovery-identifier" className={`${labelText} mt-5 mb-1.5`}>
              Email or username
            </label>
            <input
              id="recovery-identifier"
              type="text"
              required
              autoComplete="username"
              placeholder="you@heartlink.ph"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`${inputBase} ${inputState(false)}`}
            />

            <div className="mt-6 flex justify-end gap-2.5">
              <button type="button" onClick={onClose} className={secondaryButton}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !identifier.trim() || cooldown > 0}
                className={compactPrimaryButton}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Try again in {cooldown}s</span>
                ) : (
                  <span>Send instructions</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cal-surface-card text-cal-success">
              <CheckCircle2 size={20} aria-hidden="true" />
            </span>
            <h3
              id="forgot-password-title"
              className="mt-3.5 mb-0 font-cal-sans text-[18px] font-semibold leading-[1.4] text-cal-ink"
            >
              Check your email
            </h3>
            <p className="mt-1.5 mb-0 text-[14px] leading-[1.5] text-cal-muted">
              If that account exists, reset instructions are on their way. They can take a few
              minutes to arrive.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={() => {
                  setSubmitted(false);
                  setIdentifier("");
                }}
                className={secondaryButton}
              >
                {cooldown > 0 ? `Send again in ${cooldown}s` : "Send again"}
              </button>
              <button type="button" onClick={onClose} className={compactPrimaryButton}>
                Back to sign in
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

const PORTAL_ROLES = [
  {
    initials: "CA",
    fill: "bg-cal-badge-orange",
    role: "Cardiologist",
    task: "Risk level, check-up flag & weekly case review",
  },
  {
    initials: "RD",
    fill: "bg-cal-badge-emerald",
    role: "Dietitian",
    task: "Low-sodium & allergy-safe recipe verification",
  },
  {
    initials: "PT",
    fill: "bg-cal-badge-violet",
    role: "Physical Therapist",
    task: "Exercise intensity & seated movement safety",
  },
  {
    initials: "AD",
    fill: "bg-cal-badge-pink",
    role: "Administrator",
    task: "Catalog publishing, staff accounts & broadcasts",
  },
];

// ─── Main Web Login Component (Cal.com Design System) ────────────────────────
export default function HeartLinkAdminLogin() {
  const [step, setStep] = useState("login"); // "login" | "2fa"
  const [temp2faToken, setTemp2faToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [structuredError, setStructuredError] = useState(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const navigate = useNavigate();
  const { user, isAuthenticated, loading, login } = useAuth();
  const otpInputRef = useRef(null);
  const identifierInputRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // ─── 1. Auto-Redirect if Already Logged In ────────────────────────────────
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.mustChangePassword) {
        navigate("/set-password", { replace: true });
      } else if (user.role === "medical_expert") {
        navigate("/cases", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  // ─── 2. Auto-Focus Email/Username on Page Mount ───────────────────────────
  useEffect(() => {
    if (step === "login") {
      const timer = setTimeout(() => {
        identifierInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ─── 3. Resend Cooldown Countdown ─────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Forms
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isSubmittingLogin },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const {
    register: register2FA,
    handleSubmit: handle2FASubmit,
    formState: { errors: errors2FA, isSubmitting: isSubmitting2FA },
  } = useForm({
    resolver: zodResolver(twoFASchema),
    defaultValues: { code: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Focus OTP on step change
  useEffect(() => {
    if (step === "2fa") {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Caps Lock Listener
  const handleKeyUpDown = (e) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  // Login handler
  const onLogin = async (data) => {
    setStructuredError(null);
    try {
      const response = await apiFetch("/api/auth/web-login", {
        method: "POST",
        body: JSON.stringify({
          identifier: data.identifier.trim(),
          password: data.password,
          remember: remember,
        }),
      });

      if (response.requires_2fa || response.token_2fa) {
        setTemp2faToken(response.token_2fa);
        setStep("2fa");
        toast.info("Verification code sent", {
          description: "Enter the 6-digit code to finish signing in.",
        });
      } else if (response.success !== false && (response.user_id || response.success)) {
        toast.success("Signed in");
        login(response.user_id, {
          id: response.user_id,
          role: response.role,
          expert_type: response.expert_type || null,
          first_name: response.first_name || "",
          last_name: response.last_name || "",
          email: response.email || "",
          phone: response.phone || "",
          must_change_password: !!response.must_change_password,
        });

        if (response.must_change_password) {
          navigate("/set-password");
        } else if (response.role === "medical_expert") {
          navigate("/cases");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      const mapped = mapAuthError(error);
      setStructuredError(mapped);
    }
  };

  // 2FA verification handler
  const onVerify2FA = async (data) => {
    setStructuredError(null);
    try {
      const response = await apiFetch("/api/auth/web-login/verify-2fa", {
        method: "POST",
        body: JSON.stringify({
          token_2fa: temp2faToken,
          code: data.code.trim(),
          remember: remember,
        }),
      });

      if (response.success !== false && (response.user_id || response.success)) {
        toast.success("Signed in");
        login(response.user_id, {
          id: response.user_id,
          role: response.role,
          expert_type: response.expert_type || null,
          first_name: response.first_name || "",
          last_name: response.last_name || "",
          email: response.email || "",
          phone: response.phone || "",
          must_change_password: !!response.must_change_password,
        });

        if (response.must_change_password) {
          navigate("/set-password");
        } else if (response.role === "medical_expert") {
          navigate("/cases");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      const mapped = mapAuthError(error);
      setStructuredError(mapped);
    }
  };

  const identifierField = registerLogin("identifier");
  const otpField = register2FA("code", {
    onChange: (e) => {
      const val = e.target.value?.trim() || "";
      if (/^\d{6}$/.test(val) && !isSubmitting2FA) {
        handle2FASubmit(onVerify2FA)();
      }
    },
  });

  const isLoginStep = step === "login";

  return (
    <div className="flex min-h-screen w-full bg-cal-canvas font-cal-sans text-cal-ink selection:bg-cal-ink selection:text-cal-on-primary">
      {/* ─── Left Column: Sign-In Form on White Canvas ─── */}
      <main className="flex min-w-0 flex-1 flex-col justify-between gap-12 px-6 py-8 sm:px-12 xl:px-20">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className={`flex items-center gap-2.5 rounded-[6px] text-cal-ink no-underline ${focusRing}`}
          >
            <HeartLogoIcon size={28} />
            <span className="font-cal-display text-[20px] font-semibold tracking-[-0.5px] text-cal-ink">
              HeartLink
            </span>
          </Link>

          <span className="rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
            Staff portal
          </span>
        </div>

        {/* Centered form block */}
        <div className="mx-auto w-full max-w-[380px]">
          <AnimatePresence mode="wait" initial={false}>
            {isLoginStep ? (
              <motion.div key="login-step" {...stepTransition}>
                <h1 className="m-0 font-cal-display text-[28px] font-semibold leading-[1.15] tracking-[-0.75px] text-cal-ink sm:text-[32px]">
                  Sign in to the staff portal
                </h1>
                <p className="mt-2 mb-0 text-[15px] leading-[1.5] text-cal-muted">
                  For HeartLink administrators and medical experts.
                </p>

                <form onSubmit={handleLoginSubmit(onLogin)} className="mt-8 space-y-5" noValidate>
                  <ErrorBanner error={structuredError} />

                  {/* Identifier */}
                  <div>
                    <label htmlFor="identifier" className={`${labelText} mb-1.5`}>
                      Email or username
                    </label>
                    <input
                      id="identifier"
                      type="text"
                      placeholder="you@heartlink.ph"
                      autoComplete="username"
                      aria-invalid={!!loginErrors.identifier}
                      aria-describedby={loginErrors.identifier ? "identifier-error" : undefined}
                      className={`${inputBase} ${inputState(!!loginErrors.identifier)}`}
                      {...identifierField}
                      ref={(e) => {
                        identifierField.ref(e);
                        identifierInputRef.current = e;
                      }}
                    />
                    <FieldError id="identifier-error" message={loginErrors.identifier?.message} />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="password" className={labelText}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsForgotModalOpen(true)}
                        className={`border-0 bg-transparent p-0 text-[13px] ${textLink}`}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        onKeyUp={handleKeyUpDown}
                        onKeyDown={handleKeyUpDown}
                        aria-invalid={!!loginErrors.password}
                        aria-describedby={
                          loginErrors.password
                            ? "password-error"
                            : capsLockOn
                              ? "caps-lock-hint"
                              : undefined
                        }
                        className={`${inputBase} ${inputState(!!loginErrors.password)} pr-11`}
                        {...registerLogin("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className={`absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent text-cal-muted active:bg-cal-surface-soft ${focusRing}`}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError id="password-error" message={loginErrors.password?.message} />
                    {capsLockOn && !loginErrors.password && (
                      <p id="caps-lock-hint" className="mt-1.5 mb-0 text-[13px] font-medium text-cal-warning">
                        Caps Lock is on.
                      </p>
                    )}
                  </div>

                  {/* Stay signed in */}
                  <label className="flex w-fit cursor-pointer select-none items-center gap-2.5">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className={`h-4 w-4 cursor-pointer rounded accent-cal-primary ${focusRing}`}
                    />
                    <span className="text-[14px] text-cal-body">Stay signed in for 7 days</span>
                  </label>

                  <button type="submit" disabled={isSubmittingLogin} className={primaryButton}>
                    {isSubmittingLogin ? (
                      <>
                        <Loader2 size={16} className="shrink-0 animate-spin" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <span>Sign in</span>
                    )}
                  </button>
                </form>

                <p className="mt-6 mb-0 text-[13px] text-cal-muted">
                  Need an account? Ask your system administrator for a one-time staff invite.
                </p>
              </motion.div>
            ) : (
              <motion.div key="2fa-step" {...stepTransition}>
                <span className="mb-3 inline-block rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
                  Two-factor verification
                </span>
                <h1 className="m-0 font-cal-display text-[28px] font-semibold leading-[1.15] tracking-[-0.75px] text-cal-ink sm:text-[32px]">
                  Enter your verification code
                </h1>
                <p className="mt-2 mb-0 text-[15px] leading-[1.5] text-cal-muted">
                  We sent a 6-digit code to your registered device.
                </p>

                <form onSubmit={handle2FASubmit(onVerify2FA)} className="mt-8 space-y-5" noValidate>
                  <ErrorBanner error={structuredError} />

                  <div>
                    <label htmlFor="otp" className={`${labelText} mb-1.5`}>
                      Verification code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      aria-invalid={!!errors2FA.code}
                      className={`${inputBase} ${inputState(!!errors2FA.code)} h-13 text-center font-cal-mono text-[24px] font-medium tracking-[0.45em] tabular-nums placeholder:text-cal-surface-strong`}
                      {...otpField}
                      ref={(e) => {
                        otpField.ref(e);
                        otpInputRef.current = e;
                      }}
                    />
                    <FieldError message={errors2FA.code?.message} />
                    <p className="mt-2 mb-0 text-[13px] text-cal-muted">
                      The code expires in 5 minutes.
                    </p>
                  </div>

                  <button type="submit" disabled={isSubmitting2FA} className={primaryButton}>
                    {isSubmitting2FA ? (
                      <>
                        <Loader2 size={16} className="shrink-0 animate-spin" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      <span>Verify and sign in</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[13px]">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("login");
                        setStructuredError(null);
                      }}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border-0 bg-transparent p-0 font-medium text-cal-muted ${focusRing}`}
                    >
                      <ArrowLeft size={15} />
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={resendCooldown > 0}
                      onClick={() => {
                        if (resendCooldown > 0) return;
                        setResendCooldown(60);
                        toast.info("New code sent", {
                          description: "Check your registered device.",
                        });
                      }}
                      className={`border-0 bg-transparent p-0 text-[13px] ${textLink}`}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom footer line */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-cal-muted-soft">
          <span>Patients sign in through the HeartLink mobile app.</span>
          <Link to="/" className={`text-[13px] ${textLink}`}>
            Back to home
          </Link>
        </div>
      </main>

      {/* ─── Right Column: Cal.com Product-UI Showcase on `#f8f9fa` Soft Surface ─── */}
      <aside
        aria-label="About the staff portal"
        className="hidden min-w-0 flex-[1.08] items-center justify-center border-l border-cal-hairline bg-cal-surface-soft px-12 py-16 lg:flex"
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex w-full max-w-[460px] flex-col gap-6"
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[13px] font-medium text-cal-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <span className="h-2 w-2 rounded-full bg-cal-success" />
              Clinical &amp; administrative workspace
            </span>
            <h2 className="mt-4 mb-0 font-cal-display text-[28px] font-semibold leading-[1.2] tracking-[-0.5px] text-cal-ink">
              One workspace for clinical audits, approved routines, and patient safety.
            </h2>
            <p className="mt-2.5 mb-0 text-[15px] leading-[1.5] text-cal-body">
              Coordinate weekly anonymized case reviews and keep recipes, exercises, and clinic
              directories calibrated across specialties.
            </p>
          </div>

          {/* Embedded `product-mockup-card` showing real portal roles & workflow */}
          <div className="rounded-[16px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between border-b border-cal-hairline-soft pb-3.5">
              <div className="flex items-center gap-2">
                <HeartLogoIcon size={20} />
                <span className="text-[14px] font-semibold text-cal-ink">Portal role permissions</span>
              </div>
              <span className="rounded-full bg-cal-surface-card px-2.5 py-0.5 font-cal-mono text-[11px] font-medium text-cal-muted">
                4 roles
              </span>
            </div>

            <div className="mt-3.5 flex flex-col gap-2.5">
              {PORTAL_ROLES.map((item) => (
                <div
                  key={item.role}
                  className="flex items-center gap-3 rounded-[10px] bg-cal-surface-card px-3.5 py-2.5"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-cal-ink ${item.fill}`}
                  >
                    {item.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-cal-ink">{item.role}</div>
                    <div className="truncate text-[13px] text-cal-muted">{item.task}</div>
                  </div>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cal-canvas text-cal-success">
                    <Check size={14} aria-hidden="true" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-cal-muted">
            <ShieldCheck size={16} className="shrink-0 text-cal-ink" aria-hidden="true" />
            <span>Protected by role-based access, 2FA, and mandatory first-login password setup.</span>
          </div>
        </motion.div>
      </aside>

      {/* Forgot Password Modal Dialog */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
