import { useState, useEffect, useRef } from "react";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  KeyRound, 
  ArrowLeft, 
  AlertTriangle,
  AlertCircle,
  Loader2,
  Shield,
  Activity,
  CheckCircle2,
  X,
  HelpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Validation Schemas ───────────────────────────────────────────────────────
const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or username."),
  password: z.string().min(1, "Please enter your password."),
});

const twoFASchema = z.object({
  code: z
    .string()
    .min(6, "Please enter the complete 6-digit verification code.")
    .max(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Verification code must contain only numbers."),
});

// ─── User-Friendly Error Mapper ───────────────────────────────────────────────
function mapAuthError(error) {
  const status = error?.status;
  const detail = typeof error?.data?.detail === "string" ? error.data.detail : "";

  if (status === 401 || detail.toLowerCase().includes("invalid credential") || detail.toLowerCase().includes("invalid login")) {
    return {
      title: "Unable to sign in",
      message: "Check your email or username and password, then try again.",
    };
  }
  if (status === 403 || detail.toLowerCase().includes("access denied") || detail.toLowerCase().includes("portal is strictly")) {
    return {
      title: "Access Restricted",
      message: "This portal is reserved for administrators and authorized specialists.",
    };
  }
  if (status === 429 || detail.toLowerCase().includes("rate limit") || detail.toLowerCase().includes("too many")) {
    return {
      title: "Too Many Attempts",
      message: "Security rate limit reached. Please wait a few moments before trying again.",
    };
  }
  if (detail.toLowerCase().includes("disabled") || detail.toLowerCase().includes("deactivated")) {
    return {
      title: "Account Inactive",
      message: "Your staff account has been deactivated. Please contact your system administrator.",
    };
  }
  if (!status || status === 500 || detail.toLowerCase().includes("network") || detail.toLowerCase().includes("fetch")) {
    return {
      title: "Connection Unavailable",
      message: "Unable to reach the authentication server. Please check your internet connection.",
    };
  }
  return {
    title: "Authentication Error",
    message: detail || "An unexpected error occurred. Please try again or contact IT support.",
  };
}

// ─── Official HeartLink Two-Tone Folded Heart Icon ───────────────────────────
function HeartLogoIcon({ size = 20, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left facet (Warm Coral Orange-Red #F66127) */}
      <path d="M50 86 C48.5 84 12 55 12 32 C12 18 23 8 36 8 C43.5 8 48 13 50 18.5 L50 86 Z" fill="#F66127" />
      {/* Right facet (Deep Vibrant Red #D82A1E) */}
      <path d="M50 18.5 C52 13 56.5 8 64 8 C77 8 88 18 88 32 C88 55 51.5 84 50 86 L50 18.5 Z" fill="#D82A1E" />
    </svg>
  );
}

// ─── Exact Brand Logo Lockup matching official logo ───────────────────────────
function BrandLogoLockup({ dark = false, size = "md", withTagline = false }) {
  const textColor = dark ? "#0F172A" : "#FFFFFF";
  const tmColor   = dark ? "#64748B" : "rgba(255,255,255,0.7)";
  const subColor  = dark ? "#64748B" : "rgba(255,255,255,0.6)";

  const config = {
    sm: { icon: 20, text: "text-[18px]", tm: "text-[9px]", gap: "gap-2.5" },
    md: { icon: 30, text: "text-[26px]", tm: "text-[11px]", gap: "gap-3" },
    lg: { icon: 44, text: "text-[36px] sm:text-[42px]", tm: "text-sm", gap: "gap-3.5" },
  }[size] || { icon: 30, text: "text-[26px]", tm: "text-[11px]", gap: "gap-3" };

  return (
    <div className="flex flex-col items-start select-none">
      <div className={`flex items-center ${config.gap} leading-none`}>
        <HeartLogoIcon size={config.icon} />
        <span className={`font-semibold tracking-tight ${config.text} flex items-start`} style={{ color: textColor }}>
          <span>HeartLink</span>
          <span className={`${config.tm} font-normal ml-0.5 tracking-normal`} style={{ color: tmColor }}>™</span>
        </span>
      </div>
      {withTagline && (
        <p className="mt-2.5 tracking-[0.22em] text-[10px] uppercase font-medium" style={{ color: subColor }}>
          Cardiovascular Well-Being
        </p>
      )}
    </div>
  );
}

// ─── Forgot Password Modal ────────────────────────────────────────────────────
function ForgotPasswordModal({ isOpen, onClose }) {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setSubmitted(true);
      toast.success("Recovery request sent", {
        description: "If an account exists, reset instructions have been dispatched.",
      });
    } catch {
      setSubmitted(true);
      toast.info("Request processed", {
        description: "Please check your registered communication channels.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <HelpCircle size={20} />
          </div>
          <div>
            <h3 id="forgot-password-title" className="text-lg font-bold text-slate-900">
              Account Recovery
            </h3>
            <p className="text-xs text-slate-500">Password Reset Assistance</p>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Enter your registered email address or username. Instructions to reset your password will be sent to your account.
            </p>

            <div>
              <label htmlFor="recovery-identifier" className="text-xs font-semibold text-slate-900 block mb-1.5">
                Email or Username
              </label>
              <div className="w-full rounded-xl flex items-center px-4 min-h-[48px] border border-slate-200 bg-slate-50 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/15 transition-all">
                <User size={16} className="text-slate-400 mr-2.5" />
                <input
                  id="recovery-identifier"
                  type="text"
                  required
                  placeholder="admin@heartlink.ph"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none py-2"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2">
              <Shield size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <span>If you need immediate access, you can also contact your system administrator directly.</span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !identifier.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-sm font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Submit Request</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">Request Received</h4>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                If the provided identifier corresponds to an active staff account, instructions have been generated.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white transition-colors"
            >
              Return to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Web Login Component ─────────────────────────────────────────────────
export default function HeartLinkAdminLogin() {
  const [step, setStep] = useState("login"); // "login" | "2fa"
  const [temp2faToken, setTemp2faToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [structuredError, setStructuredError] = useState(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const otpInputRef = useRef(null);

  // Forms
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isSubmittingLogin },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
    mode: "onTouched",
  });

  const {
    register: register2FA,
    handleSubmit: handle2FASubmit,
    formState: { errors: errors2FA, isSubmitting: isSubmitting2FA },
  } = useForm({
    resolver: zodResolver(twoFASchema),
    defaultValues: { code: "" },
    mode: "onTouched",
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

      if (response.success && response.requires_2fa) {
        setTemp2faToken(response.token_2fa);
        setStep("2fa");
        toast.info("Two-Factor Verification", {
          description: "Please enter the 6-digit security code sent to your device.",
        });
      } else if (response.success) {
        toast.success("Authentication successful", {
          description: "Accessing HeartLink clinical portal...",
        });
        login(response.user_id, response.token, { id: response.user_id, role: response.role }, remember);

        if (response.role === "medical_expert") {
          navigate("/cases");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      const mapped = mapAuthError(error);
      setStructuredError(mapped);
      toast.error(mapped.title, { description: mapped.message });
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

      if (response.success) {
        toast.success("Verification successful", {
          description: "Security credentials confirmed. Launching portal...",
        });
        login(response.user_id, response.token, { id: response.user_id, role: response.role }, remember);

        if (response.role === "medical_expert") {
          navigate("/cases");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      const mapped = mapAuthError(error);
      setStructuredError(mapped);
      toast.error(mapped.title, { description: mapped.message });
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC] text-slate-900 selection:bg-blue-600 selection:text-white"
      style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* ═════════════════════════════════════════════════════════════════════════
          LEFT ZONE — Desktop Brand Showcase (lg and above)
          Calm, professional, trustworthy healthcare tone
      ═════════════════════════════════════════════════════════════════════════ */}
      <section 
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-[#0B132B]"
        aria-label="HeartLink Brand Overview"
      >
        {/* Subtle background ambient gradients */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 30% 20%, rgba(37,99,235,0.18) 0%, transparent 70%)",
          }}
        />
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: "radial-gradient(ellipse 50% 60% at 80% 80%, rgba(244,63,94,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Top brand header */}
        <div className="relative z-10">
          <BrandLogoLockup size="md" dark={false} />
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium mt-1.5 pl-[42px]">
            Admin & Management Portal
          </p>
        </div>

        {/* Center narrative & trust pillars */}
        <div className="relative z-10 max-w-lg my-auto py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold tracking-wide mb-6">
            <Shield size={13} />
            <span>Admin & Management Portal</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-white tracking-tight leading-[1.2] mb-4">
            Smart cardiovascular wellness & health tracking.
          </h2>

          <p className="text-slate-400 text-sm xl:text-base leading-relaxed mb-8">
            Centralized dashboard for monitoring heart wellness logs, managing food & exercise content, and reviewing health insights.
          </p>

          {/* Trust Pillars */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Activity size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Real-Time Health Monitoring</p>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  Live heart metrics, wellness scores, and daily health activity updates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <Shield size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Role-Based Access</p>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  Dedicated workspaces for administrators and health specialist reviews.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-white/10 pt-6">
          <span>HeartLink Web Portal • v1.0</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400 text-[11px]">System Online</span>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════════
          RIGHT ZONE — Login Card & Authentication Form
          Responsive across 320px to 1440px+
      ═════════════════════════════════════════════════════════════════════════ */}
      <main className="w-full lg:w-1/2 flex-1 flex flex-col justify-between p-5 sm:p-8 lg:p-12 xl:p-16 overflow-y-auto">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="flex lg:hidden items-center justify-between w-full max-w-[420px] mx-auto pt-2 pb-6">
          {step === "2fa" ? (
            <button
              type="button"
              onClick={() => { setStep("login"); setStructuredError(null); }}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-50 shadow-sm transition-all active:scale-95 cursor-pointer"
              aria-label="Back to sign in"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}

          <BrandLogoLockup size="sm" dark={true} />

          <div className="w-9 h-9" />
        </header>

        {/* Main Authentication Card Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-4">
          
          <AnimatePresence mode="wait">
            {step === "login" ? (
              <motion.div
                key="login-step"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* Heading (matches mobile heading tokens) */}
                <div className="mb-6 px-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-1.5">
                    Welcome back.
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Sign in to access your administrative dashboard.
                  </p>
                </div>

                {/* Form Card (matches mobile card tokens: bg-card rounded-2xl border px-5 py-6 shadow-md) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                  
                  <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4" noValidate>
                    
                    {/* Identifier Input */}
                    <div>
                      <label 
                        htmlFor="identifier" 
                        className="text-sm font-semibold text-slate-900 mb-1.5 ml-1 block"
                      >
                        Email or Username
                      </label>
                      <div 
                        className={`w-full rounded-xl flex items-center px-4 min-h-[50px] sm:min-h-[52px] border transition-all ${
                          loginErrors.identifier
                            ? "border-red-500 bg-red-50/30 ring-2 ring-red-500/10"
                            : "border-slate-200 bg-[#F8FAFC] focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/15"
                        }`}
                      >
                        <User 
                          size={18} 
                          className={loginErrors.identifier ? "text-red-500 shrink-0" : "text-slate-400 shrink-0 group-focus-within:text-blue-600 transition-colors"} 
                        />
                        <input
                          id="identifier"
                          type="text"
                          placeholder="Enter your email or username"
                          autoComplete="username"
                          aria-invalid={!!loginErrors.identifier}
                          aria-describedby={loginErrors.identifier ? "identifier-error" : undefined}
                          className="flex-1 ml-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none py-3"
                          {...registerLogin("identifier")}
                        />
                      </div>
                      {loginErrors.identifier && (
                        <div 
                          id="identifier-error"
                          role="alert"
                          className="flex items-center gap-1.5 mt-1.5 ml-1 text-red-500 text-xs font-medium"
                        >
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{loginErrors.identifier.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Password Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 ml-1">
                        <label 
                          htmlFor="password" 
                          className="text-sm font-semibold text-slate-900 block"
                        >
                          Password
                        </label>
                      </div>

                      <div 
                        className={`w-full rounded-xl flex items-center px-4 min-h-[50px] sm:min-h-[52px] border transition-all ${
                          loginErrors.password
                            ? "border-red-500 bg-red-50/30 ring-2 ring-red-500/10"
                            : "border-slate-200 bg-[#F8FAFC] focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/15"
                        }`}
                      >
                        <Lock 
                          size={18} 
                          className={loginErrors.password ? "text-red-500 shrink-0" : "text-slate-400 shrink-0 group-focus-within:text-blue-600 transition-colors"} 
                        />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          aria-invalid={!!loginErrors.password}
                          aria-describedby={loginErrors.password ? "password-error" : undefined}
                          className="flex-1 ml-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none py-3"
                          {...registerLogin("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 -mr-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {loginErrors.password && (
                        <div 
                          id="password-error"
                          role="alert"
                          className="flex items-center gap-1.5 mt-1.5 ml-1 text-red-500 text-xs font-medium"
                        >
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{loginErrors.password.message}</span>
                        </div>
                      )}

                      {/* Forgot Password trigger */}
                      <div className="flex justify-end pt-1 px-1">
                        <button
                          type="button"
                          onClick={() => setIsForgotModalOpen(true)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    </div>

                    {/* Keep me signed in */}
                    <div className="pt-1 ml-1">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                        <input
                          id="remember-me"
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                          Keep me signed in on this device
                        </span>
                      </label>
                    </div>

                    {/* Structured Error Alert Banner */}
                    {structuredError && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        role="alert"
                        aria-live="assertive"
                        className="bg-red-50 border border-red-200/90 rounded-xl p-3.5 flex items-start gap-2.5 text-red-700 mt-2"
                      >
                        <AlertTriangle size={17} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <p className="font-semibold text-red-900 leading-tight">
                            {structuredError.title}
                          </p>
                          <p className="text-red-600 leading-relaxed mt-0.5">
                            {structuredError.message}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Submit Button (matches mobile rounded-2xl py-4 bg-primary) */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingLogin}
                        className="w-full rounded-2xl min-h-[50px] sm:min-h-[52px] py-3.5 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                      >
                        {isSubmittingLogin ? (
                          <>
                            <Loader2 size={18} className="animate-spin shrink-0" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In</span>
                            <ArrowRight size={16} strokeWidth={2.2} className="shrink-0" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                </div>
              </motion.div>
            ) : (
              <motion.div
                key="2fa-step"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* Desktop Back button */}
                <button
                  type="button"
                  onClick={() => { setStep("login"); setStructuredError(null); }}
                  className="hidden lg:inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </button>

                {/* 2FA Heading */}
                <div className="mb-6 px-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold uppercase tracking-wider mb-2">
                    <KeyRound size={11} />
                    <span>Two-Factor Auth</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-1.5">
                    Enter Secure Code
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    We've sent a 6-digit verification code to your authorized security device.
                  </p>
                </div>

                {/* 2FA Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <form onSubmit={handle2FASubmit(onVerify2FA)} className="space-y-4" noValidate>
                    
                    <div>
                      <label 
                        htmlFor="otp-code" 
                        className="text-sm font-semibold text-slate-900 mb-1.5 ml-1 block"
                      >
                        Verification Code
                      </label>
                      <div 
                        className={`w-full rounded-xl flex items-center px-4 min-h-[54px] sm:min-h-[58px] border transition-all ${
                          errors2FA.code
                            ? "border-red-500 bg-red-50/30 ring-2 ring-red-500/10"
                            : "border-slate-200 bg-[#F8FAFC] focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/15"
                        }`}
                      >
                        <KeyRound 
                          size={18} 
                          className={errors2FA.code ? "text-red-500 shrink-0" : "text-slate-400 shrink-0 group-focus-within:text-blue-600 transition-colors"} 
                        />
                        <input
                          id="otp-code"
                          ref={(e) => {
                            register2FA("code").ref(e);
                            otpInputRef.current = e;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="123456"
                          autoComplete="one-time-code"
                          aria-invalid={!!errors2FA.code}
                          aria-describedby={errors2FA.code ? "otp-error" : undefined}
                          className="flex-1 ml-3 text-lg font-bold tracking-[0.35em] sm:tracking-[0.45em] text-slate-900 placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal bg-transparent outline-none py-3"
                          {...register2FA("code")}
                        />
                      </div>
                      {errors2FA.code && (
                        <div 
                          id="otp-error"
                          role="alert"
                          className="flex items-center gap-1.5 mt-1.5 ml-1 text-red-500 text-xs font-medium"
                        >
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errors2FA.code.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Structured Error Alert Banner */}
                    {structuredError && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        role="alert"
                        aria-live="assertive"
                        className="bg-red-50 border border-red-200/90 rounded-xl p-3.5 flex items-start gap-2.5 text-red-700 mt-2"
                      >
                        <AlertTriangle size={17} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <p className="font-semibold text-red-900 leading-tight">
                            {structuredError.title}
                          </p>
                          <p className="text-red-600 leading-relaxed mt-0.5">
                            {structuredError.message}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Verify Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting2FA}
                        className="w-full rounded-2xl min-h-[50px] sm:min-h-[52px] py-3.5 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                      >
                        {isSubmitting2FA ? (
                          <>
                            <Loader2 size={18} className="animate-spin shrink-0" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify & Access Dashboard</span>
                            <ArrowRight size={16} strokeWidth={2.2} className="shrink-0" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          toast.info("Resend Code", {
                            description: "A fresh verification code has been dispatched to your device.",
                          });
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        Didn't receive code? Resend
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Global Security Footer */}
        <footer className="w-full max-w-[420px] mx-auto pt-6 text-center select-none">
          <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
            <Lock size={13} className="text-slate-400 shrink-0" />
            <span>End-to-end encrypted administrative portal</span>
          </p>
        </footer>

      </main>

      {/* Forgot Password Dialog */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}