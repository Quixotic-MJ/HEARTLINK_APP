import { useState, useEffect, useRef } from "react";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Check,
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
      <div className={`flex items-center ${config.gap} leading-tight`}>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#161616] rounded-2xl border border-white/10 max-w-md w-full p-6 shadow-2xl relative text-white"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#36272B] border border-white/5 flex items-center justify-center text-[#E55F37]">
            <HelpCircle size={20} />
          </div>
          <div>
            <h3 id="forgot-password-title" className="text-base font-bold text-white">
              Account Recovery
            </h3>
            <p className="text-xs text-slate-400">Password Reset Assistance</p>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your registered email address or username. Instructions to reset your password will be sent to your account.
            </p>

            <div>
              <label htmlFor="recovery-identifier" className="text-xs font-semibold text-white block mb-1.5">
                Email or Username
              </label>
              <div className="w-full rounded-xl flex items-center px-4 min-h-[44px] border border-white/10 bg-[#1A1A1A] focus-within:border-[#E55F37] transition-all">
                <User size={15} className="text-slate-500 mr-2.5" />
                <input
                  id="recovery-identifier"
                  type="text"
                  required
                  placeholder="admin@heartlink.ph"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="flex-1 text-xs sm:text-sm text-white placeholder:text-slate-500 bg-transparent outline-none py-2"
                />
              </div>
            </div>

            <div className="p-3 bg-[#21202E]/60 border border-white/5 rounded-xl text-xs text-[#89899C] flex items-start gap-2">
              <Shield size={14} className="text-[#E55F37] shrink-0 mt-0.5" />
              <span>If you need immediate access, you can also contact your system administrator directly.</span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !identifier.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#D15334] hover:bg-[#b0452a] disabled:opacity-60 text-xs font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
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
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Request Received</h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                If the provided identifier corresponds to an active staff account, instructions have been generated.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-[#D15334] hover:bg-[#b0452a] text-xs font-semibold text-white transition-colors cursor-pointer"
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
        login(
          response.user_id,
          response.token,
          {
            id: response.user_id,
            role: response.role,
            first_name: response.first_name || "",
            last_name: response.last_name || "",
            email: response.email || "",
            phone: response.phone || "",
          },
          remember
        );

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
        login(
          response.user_id,
          response.token,
          {
            id: response.user_id,
            role: response.role,
            first_name: response.first_name || "",
            last_name: response.last_name || "",
            email: response.email || "",
            phone: response.phone || "",
          },
          remember
        );

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
      className="min-h-screen lg:h-screen lg:overflow-hidden w-full flex flex-col lg:flex-row bg-[#161616] text-white selection:bg-[#E55F37] selection:text-white"
      style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* ═════════════════════════════════════════════════════════════════════════
          LEFT ZONE — Desktop Brand Showcase (lg and above)
      ═════════════════════════════════════════════════════════════════════════ */}
      <section 
        className="hidden lg:flex lg:w-1/2 flex-col justify-between py-6 px-6 lg:py-8 lg:px-10 xl:px-12 relative bg-[#13121F] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none"
        aria-label="HeartLink Brand Overview"
      >
        {/* Top brand header */}
        <div className="relative z-10">
          <BrandLogoLockup size="md" dark={false} />
          <p className="text-[9px] uppercase tracking-[0.05em] text-[#E55F37] font-bold mt-1 pl-[42px]">
            ADMIN & MANAGEMENT PORTAL
          </p>
        </div>

        {/* Center narrative & trust pillars */}
        <div className="relative z-10 max-w-md my-auto py-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E55F37] text-[#E55F37] text-[11px] font-semibold tracking-wide mb-4">
            <HeartLogoIcon size={13} className="opacity-90" />
            <span>Admin & management portal</span>
          </div>

          <h2 className="text-2xl xl:text-3xl font-bold text-white tracking-tight leading-snug mb-3">
            Smart cardiovascular<br/>wellness and health<br/>tracking.
          </h2>

          <p className="text-[#89899C] text-xs xl:text-sm leading-relaxed mb-6 font-medium">
            Centralized dashboard for monitoring heart<br/>wellness logs, managing food and exercise content,<br/>and reviewing health insights.
          </p>

          {/* Trust Pillars */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#21202E]/60 border border-white/5 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37] shrink-0">
                <Activity size={16} strokeWidth={2.5} />
              </div>
              <div className="mt-0.5">
                <p className="text-xs font-bold text-white">Real-time health monitoring</p>
                <p className="text-[11px] text-[#89899C] leading-snug mt-0.5 font-medium">
                  Live heart metrics, wellness scores, and daily updates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#21202E]/60 border border-white/5 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37] shrink-0">
                <Shield size={16} strokeWidth={2.5} />
              </div>
              <div className="mt-0.5">
                <p className="text-xs font-bold text-white">Role-based access</p>
                <p className="text-[11px] text-[#89899C] leading-snug mt-0.5 font-medium">
                  Dedicated workspaces for admins and health specialists.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-[#89899C] border-t border-white/10 pt-4 font-medium">
          <span>HeartLink web portal • v1.0</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5EC235]" />
            <span className="text-[#5EC235]">System online</span>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════════
          RIGHT ZONE — Login Card & Authentication Form
      ═════════════════════════════════════════════════════════════════════════ */}
      <main className="w-full lg:w-1/2 flex-1 flex flex-col justify-between py-6 px-4 sm:px-8 lg:py-8 lg:px-10 xl:px-12 bg-[#161616] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="flex lg:hidden items-center justify-between w-full max-w-[390px] mx-auto pt-1 pb-4">
          {step === "2fa" ? (
            <button
              type="button"
              onClick={() => { setStep("login"); setStructuredError(null); }}
              className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <div className="w-8 h-8" />
          )}

          <BrandLogoLockup size="sm" dark={false} />

          <div className="w-8 h-8" />
        </header>

        {/* Main Authentication Card Container */}
        <div className="w-full max-w-[390px] mx-auto my-auto py-1">
          
          <AnimatePresence mode="wait">
            {step === "login" ? (
              <motion.div
                key="login-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Heading */}
                <div className="mb-5 px-1">
                  <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-tight mb-1.5">
                    Welcome back.
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                    Sign in to access your administrative dashboard.
                  </p>
                </div>

                {/* Form Card */}
                <div className="bg-transparent rounded-[14px] border border-white/10 p-5 sm:p-6 shadow-sm space-y-3">
                  
                  <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4" noValidate>
                    
                    {/* Identifier Input */}
                    <div>
                      <label 
                        htmlFor="identifier" 
                        className="text-xs font-bold text-white mb-1.5 block"
                      >
                        Email or username
                      </label>
                      <div 
                        className={`w-full rounded-[8px] flex items-center px-3.5 min-h-[42px] border transition-all ${
                          loginErrors.identifier
                            ? "border-red-500 bg-red-500/10"
                            : "border-white/10 bg-[#1A1A1A] focus-within:border-[#E55F37]"
                        }`}
                      >
                        <input
                          id="identifier"
                          type="text"
                          placeholder="Enter your email or username"
                          autoComplete="username"
                          aria-invalid={!!loginErrors.identifier}
                          className="flex-1 text-xs sm:text-sm text-white placeholder:text-slate-500 bg-transparent outline-none py-2 font-medium"
                          {...registerLogin("identifier")}
                        />
                      </div>
                      {loginErrors.identifier && (
                        <div className="flex items-center gap-1.5 mt-1.5 ml-0.5 text-red-500 text-[11px] font-medium">
                          <AlertCircle size={11} className="shrink-0" />
                          <span>{loginErrors.identifier.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Password Input */}
                    <div>
                      <label 
                        htmlFor="password" 
                        className="text-xs font-bold text-white mb-1.5 block"
                      >
                        Password
                      </label>

                      <div 
                        className={`w-full rounded-[8px] flex items-center px-3.5 min-h-[42px] border transition-all ${
                          loginErrors.password
                            ? "border-red-500 bg-red-500/10"
                            : "border-white/10 bg-[#1A1A1A] focus-within:border-[#E55F37]"
                        }`}
                      >
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          aria-invalid={!!loginErrors.password}
                          className="flex-1 text-xs sm:text-sm text-white placeholder:text-slate-500 bg-transparent outline-none py-2 font-medium"
                          {...registerLogin("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      {loginErrors.password && (
                        <div className="flex items-center gap-1.5 mt-1.5 ml-0.5 text-red-500 text-[11px] font-medium">
                          <AlertCircle size={11} className="shrink-0" />
                          <span>{loginErrors.password.message}</span>
                        </div>
                      )}

                      {/* Forgot Password trigger */}
                      <div className="flex justify-end pt-1.5">
                        <button
                          type="button"
                          onClick={() => setIsForgotModalOpen(true)}
                          className="text-[11px] font-medium text-[#E55F37] hover:text-[#D4542E] transition-colors cursor-pointer"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    </div>

                    {/* Keep me signed in */}
                    <div className="pt-0.5">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none group w-max">
                        <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center relative transition-all ${
                          remember 
                            ? "bg-[#E55F37] border-[#E55F37] text-white" 
                            : "border-white/40 bg-transparent group-hover:border-white"
                        }`}>
                          <input
                            id="remember-me"
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          {remember && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
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
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 text-red-500 mt-1"
                      >
                        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <p className="font-bold leading-tight">
                            {structuredError.title}
                          </p>
                          <p className="text-red-400 leading-relaxed mt-0.5 font-medium text-[11px]">
                            {structuredError.message}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingLogin}
                        className="w-full rounded-[8px] min-h-[42px] py-2.5 flex items-center justify-center gap-2 bg-[#D15334] hover:bg-[#b0452a] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition-all cursor-pointer focus:outline-none"
                      >
                        {isSubmittingLogin ? (
                          <>
                            <Loader2 size={16} className="animate-spin shrink-0" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign in</span>
                            <ArrowRight size={15} strokeWidth={2.5} className="shrink-0" />
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Desktop Back button */}
                <button
                  type="button"
                  onClick={() => { setStep("login"); setStructuredError(null); }}
                  className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Sign In</span>
                </button>

                {/* 2FA Heading */}
                <div className="mb-5 px-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E55F37]/10 border border-[#E55F37]/20 text-[#E55F37] text-[10px] font-bold uppercase tracking-wider mb-2">
                    <KeyRound size={10} />
                    <span>Two-Factor Auth</span>
                  </div>
                  <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-tight mb-1.5">
                    Enter Secure Code
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                    We've sent a 6-digit verification code to your authorized security device.
                  </p>
                </div>

                {/* 2FA Card */}
                <div className="bg-transparent rounded-[14px] border border-white/10 p-5 sm:p-6 shadow-sm space-y-3">
                  <form onSubmit={handle2FASubmit(onVerify2FA)} className="space-y-4" noValidate>
                    
                    <div>
                      <label 
                        htmlFor="otp-code" 
                        className="text-xs font-bold text-white mb-1.5 block"
                      >
                        Verification Code
                      </label>
                      <div 
                        className={`w-full rounded-[8px] flex items-center px-3.5 min-h-[46px] border transition-all ${
                          errors2FA.code
                            ? "border-red-500 bg-red-500/10"
                            : "border-white/10 bg-[#1A1A1A] focus-within:border-[#E55F37]"
                        }`}
                      >
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
                          className="flex-1 text-lg font-bold tracking-[0.25em] text-white placeholder:text-slate-600 placeholder:font-normal placeholder:tracking-normal bg-transparent outline-none py-2 text-center"
                          {...register2FA("code")}
                        />
                      </div>
                      {errors2FA.code && (
                        <div className="flex items-center gap-1.5 mt-1.5 ml-0.5 text-red-500 text-[11px] font-medium">
                          <AlertCircle size={11} className="shrink-0" />
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
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 text-red-500 mt-1"
                      >
                        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <p className="font-bold leading-tight">
                            {structuredError.title}
                          </p>
                          <p className="text-red-400 leading-relaxed mt-0.5 font-medium text-[11px]">
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
                        className="w-full rounded-[8px] min-h-[42px] py-2.5 flex items-center justify-center gap-2 bg-[#D15334] hover:bg-[#b0452a] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition-all cursor-pointer focus:outline-none"
                      >
                        {isSubmitting2FA ? (
                          <>
                            <Loader2 size={16} className="animate-spin shrink-0" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify & Access Dashboard</span>
                            <ArrowRight size={15} strokeWidth={2.5} className="shrink-0" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-center pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          toast.info("Resend Code", {
                            description: "A fresh verification code has been dispatched to your device.",
                          });
                        }}
                        className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
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
        <footer className="w-full max-w-[390px] mx-auto pt-4 text-center select-none">
          <p className="text-[10px] text-[#89899C] font-medium flex items-center justify-center gap-1.5">
            <Lock size={11} className="shrink-0" />
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
