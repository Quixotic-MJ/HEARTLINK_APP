import { useState, useEffect, useRef, useId } from "react";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Loader2,
  CheckCircle2,
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

  if (status === 401 || detail.toLowerCase().includes("invalid credential") || detail.toLowerCase().includes("invalid login")) {
    return {
      title: "Email, username or password is incorrect",
      message: "Check both fields and try again. Passwords are case-sensitive.",
    };
  }
  if (status === 403 || detail.toLowerCase().includes("access denied") || detail.toLowerCase().includes("portal is strictly")) {
    return {
      title: "This account can't use the admin portal",
      message: "The portal is for administrators and medical experts. Patients sign in through the HeartLink mobile app.",
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
          <stop offset="0" stopColor="#2B84FF"/><stop offset="0.30" stopColor="#2E8DF5"/>
          <stop offset="0.52" stopColor="#38B3B5"/><stop offset="0.68" stopColor="#5CC974"/>
          <stop offset="0.81" stopColor="#B2D65A"/><stop offset="0.91" stopColor="#F7A63C"/>
          <stop offset="1" stopColor="#FF9A2E"/>
        </linearGradient>
        <linearGradient id={gid("hl-bottomleft")} gradientUnits="userSpaceOnUse" x1="0" y1="-30" x2="0" y2="122">
          <stop offset="0" stopColor="#2B87FF"/><stop offset="0.45" stopColor="#2A86F5"/>
          <stop offset="0.62" stopColor="#2D9BE0"/><stop offset="0.78" stopColor="#30BE9C"/>
          <stop offset="1" stopColor="#33CC82"/>
        </linearGradient>
        <linearGradient id={gid("hl-bottomright")} gradientUnits="userSpaceOnUse" x1="122" y1="0" x2="-32" y2="0">
          <stop offset="0" stopColor="#3FC98A"/><stop offset="0.30" stopColor="#7ACD68"/>
          <stop offset="0.50" stopColor="#B6D85A"/><stop offset="0.70" stopColor="#C2D857"/>
          <stop offset="0.85" stopColor="#F2A93C"/><stop offset="1" stopColor="#FF9A2E"/>
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
        <path d={EMBLEM_PATHS[0]} stroke="#FF4B4B"/>
        <path d={EMBLEM_PATHS[1]} stroke={`url(#${gid("hl-topright")})`}/>
        <path d={EMBLEM_PATHS[2]} stroke={`url(#${gid("hl-bottomleft")})`}/>
        <path d={EMBLEM_PATHS[3]} stroke={`url(#${gid("hl-bottomright")})`}/>
      </g>
    </svg>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const compactPrimaryButton = primaryButton.replace("w-full h-11", "h-10 px-4");

const secondaryButton =
  `h-10 px-4 rounded-[8px] border border-ds-hairline bg-ds-canvas text-[14px] font-semibold text-ds-charcoal hover:bg-ds-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${focusRing}`;

const card =
  "bg-ds-canvas border border-ds-hairline rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04),0_16px_40px_-16px_rgba(15,23,42,0.12)]";

const stepTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: "easeIn" } },
};

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 mt-1.5 text-ds-danger text-[13px]">
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
      className="flex gap-3 rounded-xl bg-ds-rose px-4 py-3.5 text-[14px] leading-snug"
    >
      <AlertTriangle size={18} className="shrink-0 mt-px text-ds-danger" aria-hidden="true" />
      <div>
        {/* Dark text on the pink tint: red on pink fails contrast (HEARTLINK.md). */}
        <p className="font-semibold text-ds-ink">{error.title}</p>
        <p className="mt-1 leading-normal text-ds-charcoal">{error.message}</p>
      </div>
    </div>
  );
}

// ─── Animated Background ──────────────────────────────────────────────────────
// Drifting blue/green colour fields, a dot grid, and small glowing floating orbs.
// Animation stops for people who prefer reduced motion.
const backdropCss = `
.hl-field { position: absolute; border-radius: 50%; filter: blur(55px); will-change: transform; }
.hl-field-blue {
  width: 62vmax; height: 62vmax; top: -20vmax; left: -18vmax;
  background: radial-gradient(circle, rgba(93,169,255,0.75), rgba(93,169,255,0) 68%);
  animation: hl-drift-blue 16s ease-in-out infinite;
}
.hl-field-green {
  width: 58vmax; height: 58vmax; top: -16vmax; right: -16vmax;
  background: radial-gradient(circle, rgba(142,222,150,0.65), rgba(142,222,150,0) 68%);
  animation: hl-drift-green 19s ease-in-out infinite;
}
.hl-field-blue-low {
  width: 54vmax; height: 54vmax; bottom: -28vmax; left: 6vmax;
  background: radial-gradient(circle, rgba(93,169,255,0.4), rgba(93,169,255,0) 68%);
  animation: hl-drift-low 21s ease-in-out infinite;
}
.hl-field-green-low {
  width: 46vmax; height: 46vmax; bottom: -22vmax; right: 4vmax;
  background: radial-gradient(circle, rgba(142,222,150,0.35), rgba(142,222,150,0) 68%);
  animation: hl-drift-low2 24s ease-in-out infinite;
}
@keyframes hl-drift-blue { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(9vw, 7vh) scale(1.18); } }
@keyframes hl-drift-green { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-8vw, 9vh) scale(1.14); } }
@keyframes hl-drift-low { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(6vw, -6vh) scale(1.12); } }
@keyframes hl-drift-low2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-7vw, -5vh) scale(1.1); } }

.hl-dot-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(60, 90, 130, 0.22) 1.3px, transparent 1.3px);
  background-size: 28px 28px;
  -webkit-mask-image: radial-gradient(ellipse 72% 62% at 50% 42%, black 0%, transparent 78%);
  mask-image: radial-gradient(ellipse 72% 62% at 50% 42%, black 0%, transparent 78%);
}

.hl-orb { position: absolute; border-radius: 50%; animation: hl-float-orb ease-in-out infinite; }
@keyframes hl-float-orb {
  0%, 100% { transform: translateY(0) translateX(0) scale(1); }
  50% { transform: translateY(-34px) translateX(16px) scale(1.15); }
}

/* Cursor spotlight: a soft glow plus brighter dots near the pointer */
.hl-spot-glow, .hl-dot-grid-lit {
  position: absolute; inset: 0;
  opacity: var(--hl-spot, 0);
  transition: opacity 0.5s ease;
}
.hl-spot-glow {
  background: radial-gradient(520px circle at var(--hl-mx, 50%) var(--hl-my, 40%), rgba(93,169,255,0.22), transparent 62%);
}
.hl-dot-grid-lit {
  background-image: radial-gradient(rgba(46,154,232,0.75) 1.4px, transparent 1.4px);
  background-size: 28px 28px;
  -webkit-mask-image: radial-gradient(200px circle at var(--hl-mx, 50%) var(--hl-my, 40%), black, transparent 75%);
  mask-image: radial-gradient(200px circle at var(--hl-mx, 50%) var(--hl-my, 40%), black, transparent 75%);
}
@media (hover: none) {
  .hl-spot-glow, .hl-dot-grid-lit { display: none; }
}

/* Glowing highlight that travels around the card edge */
@property --hl-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@keyframes hl-spin { to { --hl-angle: 360deg; } }
.hl-glow-border::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; pointer-events: none;
  background: conic-gradient(from var(--hl-angle), transparent 0deg, rgba(93,169,255,0.95) 50deg, rgba(142,222,150,0.95) 100deg, transparent 150deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: hl-spin 7s linear infinite;
}

/* Logo heartbeat with a ripple ring */
@keyframes hl-heartbeat {
  0%, 60%, 100% { transform: scale(1); }
  66% { transform: scale(1.12); }
  72% { transform: scale(1); }
  78% { transform: scale(1.08); }
  84% { transform: scale(1); }
}
@keyframes hl-ripple {
  0%, 60% { transform: scale(1); opacity: 0; }
  64% { opacity: 0.55; }
  100% { transform: scale(1.75); opacity: 0; }
}
.hl-heartbeat { animation: hl-heartbeat 2.4s ease-in-out infinite; }
.hl-ripple {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: 0 0 0 2px rgba(93,169,255,0.6), 0 0 18px 2px rgba(93,169,255,0.35);
  animation: hl-ripple 2.4s ease-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .hl-field, .hl-orb { animation: none !important; }
  .hl-glow-border::before, .hl-heartbeat { animation: none !important; }
  .hl-ripple { display: none; }
}
`;

const BLUE = "93,169,255";
const GREEN = "142,222,150";

const FLOATING_ORBS = [
  { size: 16, top: "16%", left: "10%", rgb: BLUE, alpha: 0.75, glow: "0 0 22px 6px", glowAlpha: 0.55, duration: 7, delay: 0 },
  { size: 12, top: "28%", left: "88%", rgb: GREEN, alpha: 0.8, glow: "0 0 20px 6px", glowAlpha: 0.55, duration: 9, delay: 1 },
  { size: 20, top: "72%", left: "18%", rgb: BLUE, alpha: 0.6, glow: "0 0 26px 8px", glowAlpha: 0.45, duration: 11, delay: 2 },
  { size: 14, top: "64%", left: "82%", rgb: GREEN, alpha: 0.75, glow: "0 0 22px 6px", glowAlpha: 0.5, duration: 8, delay: 0.5 },
  { size: 9, top: "48%", left: "5%", rgb: BLUE, alpha: 0.7, glow: "0 0 16px 5px", glowAlpha: 0.5, duration: 6.5, delay: 1.5 },
  { size: 10, top: "10%", left: "52%", rgb: GREEN, alpha: 0.7, glow: "0 0 18px 5px", glowAlpha: 0.5, duration: 10, delay: 3 },
  { size: 13, top: "85%", left: "52%", rgb: BLUE, alpha: 0.65, glow: "0 0 20px 6px", glowAlpha: 0.45, duration: 9.5, delay: 2.5 },
];

export function LoginBackdrop() {
  const backdropRef = useRef(null);

  // Feed the pointer position to CSS variables (no React re-renders).
  useEffect(() => {
    const el = backdropRef.current;
    if (!el) return undefined;
    let frame = 0;
    const handleMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--hl-mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--hl-my", `${e.clientY - rect.top}px`);
        el.style.setProperty("--hl-spot", "1");
      });
    };
    const handleLeave = () => el.style.setProperty("--hl-spot", "0");
    window.addEventListener("pointermove", handleMove);
    document.documentElement.addEventListener("pointerleave", handleLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handleMove);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <div ref={backdropRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{backdropCss}</style>

      <div className="hl-field hl-field-blue" />
      <div className="hl-field hl-field-green" />
      <div className="hl-field hl-field-blue-low" />
      <div className="hl-field hl-field-green-low" />
      <div className="hl-dot-grid" />
      <div className="hl-spot-glow" />
      <div className="hl-dot-grid-lit" />

      {FLOATING_ORBS.map((orb) => (
        <div
          key={`${orb.top}-${orb.left}`}
          className="hl-orb"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: `rgba(${orb.rgb},${orb.alpha})`,
            boxShadow: `${orb.glow} rgba(${orb.rgb},${orb.glowAlpha})`,
            animationDuration: `${orb.duration}s`,
            animationDelay: `${orb.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Forgot Password Modal ────────────────────────────────────────────────────
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ds-ink/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={`${card} relative w-full max-w-[400px] p-6 text-ds-ink`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-3.5 right-3.5 p-1.5 rounded-lg text-ds-steel hover:text-ds-charcoal hover:bg-ds-surface-alt transition-colors cursor-pointer ${focusRing}`}
        >
          <X size={18} />
        </button>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <h3 id="forgot-password-title" className="text-[18px] font-semibold tracking-[-0.01em] pr-8">
              Reset your password
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ds-slate">
              Enter the email or username on your staff account and we'll send you instructions to reset your password.
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
            <CheckCircle2 size={22} className="text-ds-charcoal" aria-hidden="true" />
            <h3 id="forgot-password-title" className="mt-3 text-[18px] font-semibold tracking-[-0.01em]">
              Check your email
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ds-slate">
              If that account exists, reset instructions are on their way. They can take a few minutes to arrive.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={() => { setSubmitted(false); setIdentifier(""); }}
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

// Small squares on the navy panel, in the logo's own colours (allowed by HEARTLINK.md).
const PANEL_DOTS = [
  { className: "top-[9%] right-[12%] h-4 w-4 rotate-[9deg]", color: "#FF4B4B" },
  { className: "top-[17%] right-[5%] h-2.5 w-2.5 -rotate-12", color: "#2B84FF" },
  { className: "top-[46%] right-[4%] h-[13px] w-[13px] rotate-[14deg]", color: "#5CC974" },
  { className: "bottom-[8%] left-[9%] h-3.5 w-3.5 -rotate-[8deg]", color: "#FF9A2E" },
  { className: "bottom-[14%] right-[9%] h-[9px] w-[9px] rotate-[20deg]", color: "#FF4B4B" },
  { className: "bottom-[4%] left-[42%] h-[11px] w-[11px] rotate-6", color: "#2B84FF" },
];

// ─── Main Web Login Component ─────────────────────────────────────────────────
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
    watch: watch2FA,
    formState: { errors: errors2FA, isSubmitting: isSubmitting2FA },
  } = useForm({
    resolver: zodResolver(twoFASchema),
    defaultValues: { code: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const otpValue = watch2FA("code");

  // Focus OTP on step change
  useEffect(() => {
    if (step === "2fa") {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Auto-Submit 2FA when exactly 6 digits are typed
  useEffect(() => {
    if (otpValue?.length === 6 && !isSubmitting2FA) {
      handle2FASubmit(onVerify2FA)();
    }
  }, [otpValue]);

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
        login(
          response.user_id,
          {
            id: response.user_id,
            role: response.role,
            expert_type: response.expert_type || null,
            first_name: response.first_name || "",
            last_name: response.last_name || "",
            email: response.email || "",
            phone: response.phone || "",
            must_change_password: !!response.must_change_password,
          }
        );

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
        login(
          response.user_id,
          {
            id: response.user_id,
            role: response.role,
            expert_type: response.expert_type || null,
            first_name: response.first_name || "",
            last_name: response.last_name || "",
            email: response.email || "",
            phone: response.phone || "",
            must_change_password: !!response.must_change_password,
          }
        );

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

  const isLoginStep = step === "login";

  return (
    <div
      className="min-h-screen w-full flex bg-ds-canvas text-ds-ink selection:bg-ds-primary selection:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <main className="flex-1 min-w-0 flex flex-col justify-between gap-14 px-5 py-8 sm:px-12 xl:px-24">
        <Link to="/" className={`flex w-fit items-center gap-2.5 rounded-[4px] text-ds-ink no-underline ${focusRing}`}>
          <HeartLogoIcon size={32} />
          <span className="text-[18px] font-semibold tracking-[-0.01em]">HeartLink</span>
        </Link>

        <div className="w-full max-w-[400px]">
          <AnimatePresence mode="wait" initial={false}>
            {isLoginStep ? (
              <motion.div key="login-step" {...stepTransition}>
                <h1 className="text-[28px] leading-[1.25] font-semibold tracking-[-0.02em]">
                  Sign in to the staff portal
                </h1>
                <p className="mt-2 text-[15px] leading-[1.55] text-ds-slate">
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
                      {...registerLogin("identifier")}
                      ref={(e) => {
                        registerLogin("identifier").ref(e);
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
                        className={`text-[14px] ${textLink}`}
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
                        aria-describedby={loginErrors.password ? "password-error" : capsLockOn ? "caps-lock-hint" : undefined}
                        className={`${inputBase} ${inputState(!!loginErrors.password)} pr-12`}
                        {...registerLogin("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-md text-ds-steel hover:text-ds-ink transition-colors cursor-pointer ${focusRing}`}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <FieldError id="password-error" message={loginErrors.password?.message} />
                    {capsLockOn && !loginErrors.password && (
                      <p id="caps-lock-hint" className="mt-1.5 text-[13px] text-ds-warm-text">
                        Caps Lock is on.
                      </p>
                    )}
                  </div>

                  {/* Stay signed in */}
                  <label className="flex w-fit items-center gap-2.5 cursor-pointer select-none">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className={`h-4 w-4 rounded accent-ds-line cursor-pointer ${focusRing}`}
                    />
                    <span className="text-[14px] text-ds-charcoal">Stay signed in for 7 days</span>
                  </label>

                  <button type="submit" disabled={isSubmittingLogin} className={primaryButton}>
                    {isSubmittingLogin ? (
                      <>
                        <Loader2 size={16} className="animate-spin shrink-0" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <span>Sign in</span>
                    )}
                  </button>
                </form>

                <p className="mt-6 text-[14px] text-ds-slate">
                  Need an account? Ask your system administrator.
                </p>
              </motion.div>
            ) : (
              <motion.div key="2fa-step" {...stepTransition}>
                <h1 className="text-[28px] leading-[1.25] font-semibold tracking-[-0.02em]">
                  Enter your verification code
                </h1>
                <p className="mt-2 text-[15px] leading-[1.55] text-ds-slate">
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
                      className={`${inputBase} ${inputState(!!errors2FA.code)} h-14 text-center text-[26px] font-semibold tracking-[0.45em] tabular-nums placeholder:text-ds-hairline-strong`}
                      {...register2FA("code")}
                      ref={(e) => {
                        register2FA("code").ref(e);
                        otpInputRef.current = e;
                      }}
                    />
                    <FieldError message={errors2FA.code?.message} />
                    <p className="mt-2 text-[13px] text-ds-slate">The code expires in 5 minutes.</p>
                  </div>

                  <button type="submit" disabled={isSubmitting2FA} className={primaryButton}>
                    {isSubmitting2FA ? (
                      <>
                        <Loader2 size={16} className="animate-spin shrink-0" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      <span>Verify and sign in</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[14px]">
                    <button
                      type="button"
                      onClick={() => { setStep("login"); setStructuredError(null); }}
                      className={`inline-flex items-center gap-1.5 font-medium text-ds-slate hover:text-ds-ink transition-colors cursor-pointer rounded-[4px] ${focusRing}`}
                    >
                      <ArrowLeft size={16} />
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
                      className={textLink}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-[13px] text-ds-steel">
          Patients sign in through the HeartLink mobile app.
        </p>
      </main>

      {/* Brand panel: wide screens only; phones already show the logo above the form. */}
      <aside
        aria-label="About the staff portal"
        className="relative hidden lg:flex flex-[1.15] min-w-0 items-center justify-center overflow-hidden bg-ds-navy px-12 py-16 text-white"
      >
        {PANEL_DOTS.map((dot) => (
          <span
            key={dot.className}
            aria-hidden="true"
            className={`absolute rounded-[3px] ${dot.className}`}
            style={{ backgroundColor: dot.color }}
          />
        ))}
        <div className="relative flex max-w-[420px] flex-col items-center gap-8 text-center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <HeartLogoIcon size={136} />
          </motion.div>
          <div>
            <h2 className="text-[28px] leading-[1.25] font-semibold tracking-[-0.02em]">
              HeartLink staff portal
            </h2>
            <p className="mt-2.5 text-[15px] leading-[1.55] text-white/70">
              For cardiologists, dietitians, physical therapists and admins.
            </p>
          </div>
        </div>
      </aside>

      {/* Forgot Password Modal Dialog */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
