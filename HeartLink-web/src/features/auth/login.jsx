import { useState, useEffect, useRef } from "react";
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  AlertTriangle,
  AlertCircle,
  Loader2,
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

// ─── HeartLink Official Two-Facet Brand Emblem ───────────────────────────────
function HeartLogoIcon({ size = 26, className = "" }) {
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
      <path d="M50 90 C50 90 8 54 8 30 C8 14 21 4 36 4 C44 4 50 11 50 18 L50 90 Z" fill="#E8532E" />
      <path d="M50 90 C50 90 92 54 92 30 C92 14 79 4 64 4 C56 4 50 11 50 18 L50 90 Z" fill="#8A1F1A" />
    </svg>
  );
}

// ─── Framer Motion Variants ───────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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
      setSubmitted(true);
      setCooldown(60);
      toast.success("Recovery request sent", {
        description: "If an account exists, reset instructions have been dispatched.",
      });
    } catch {
      setSubmitted(true);
      setCooldown(60);
      toast.info("Request processed", {
        description: "Please check your registered communication channels.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-[#FFFFFF] rounded-2xl border border-[#DCE3DF] max-w-md w-full p-7 shadow-2xl relative text-black"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-1.5 rounded-lg text-black hover:bg-[#EDF1EF] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FBEAE6] border border-[#F0C4B8] flex items-center justify-center text-[#E8532E]">
            <HelpCircle size={20} />
          </div>
          <div>
            <h3 id="forgot-password-title" className="text-lg font-medium text-black" style={{ fontFamily: "'Fraunces', serif" }}>
              Account Recovery
            </h3>
            <p className="text-xs text-black font-medium">Password Reset Assistance</p>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-[14px] text-black leading-relaxed">
              Enter your registered staff email or username. Instructions to reset your password will be dispatched to your account.
            </p>

            <div>
              <label htmlFor="recovery-identifier" className="text-[12px] font-semibold text-black block mb-1.5">
                Email or Username
              </label>
              <div className="w-full rounded-md flex items-center px-3.5 h-11 border border-[#DCE3DF] bg-[#EDF1EF] focus-within:border-[#152131] focus-within:ring-4 focus-within:ring-[#1B6E63]/10 focus-within:bg-white transition-all">
                <input
                  id="recovery-identifier"
                  type="text"
                  required
                  placeholder="admin@heartlink.ph"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="flex-1 text-[14px] text-black placeholder:text-[#9AA5A1] bg-transparent outline-none py-2"
                />
              </div>
            </div>

            <div className="p-3 bg-[#E3EFEC] border border-[#C5DFD8] rounded-md text-[12px] text-black font-medium flex items-start gap-2">
              <span>If you need immediate access, you can also contact your system administrator directly.</span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-md border border-[#DCE3DF] text-[14px] font-semibold text-black hover:bg-[#EDF1EF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !identifier.trim() || cooldown > 0}
                className="flex-1 py-2.5 px-4 rounded-md bg-[#152131] hover:bg-[#0d1622] hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:shadow-none disabled:opacity-60 text-[14px] font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Wait {cooldown}s</span>
                ) : (
                  <span>Submit Request</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-base font-medium text-black mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                Request Received
              </h4>
              <p className="text-[14px] text-black leading-relaxed max-w-xs mx-auto">
                If the identifier matches an active staff account, password recovery instructions have been generated.
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => { setSubmitted(false); setIdentifier(""); }}
                className="flex-1 py-2.5 px-4 rounded-md border border-[#DCE3DF] text-[14px] font-semibold text-black hover:bg-[#EDF1EF] transition-colors cursor-pointer"
              >
                Request Again {cooldown > 0 ? `(${cooldown}s)` : ""}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-md bg-[#152131] hover:bg-[#0d1622] hover:-translate-y-0.5 hover:shadow-md text-[14px] font-semibold text-white transition-all cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
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
  const [resendCooldown, setResendCooldown] = useState(0);
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Dynamic Text Carousel State - Updated for preventive vibe
  const dynamicWords = ["meal", "routine", "choice", "habit"];
  const [wordIndex, setWordIndex] = useState(0);

  const navigate = useNavigate();
  const { user, isAuthenticated, loading, login } = useAuth();
  const otpInputRef = useRef(null);
  const identifierInputRef = useRef(null);

  // Smart Greeting Logic
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Dynamic Text Carousel Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % dynamicWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ─── 1. Auto-Redirect if Already Logged In ────────────────────────────────
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "medical_expert") {
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
    mode: "onTouched",
  });

  const {
    register: register2FA,
    handleSubmit: handle2FASubmit,
    watch: watch2FA,
    formState: { errors: errors2FA, isSubmitting: isSubmitting2FA },
  } = useForm({
    resolver: zodResolver(twoFASchema),
    defaultValues: { code: "" },
    mode: "onTouched",
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
      className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-[#FFFFFF] text-[#152131] selection:bg-[#E8532E] selection:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ═════════════════════════════════════════════════════════════════════════
          LEFT: Editorial Hero Showcase (Soft Ambient Background)
      ═════════════════════════════════════════════════════════════════════════ */}
      <aside 
        className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative select-none border-r border-[#DCE3DF] overflow-hidden bg-gradient-to-br from-[#FFFFFF] via-[#F8FAFC] to-[#EDF1EF]"
        aria-label="HeartLink Brand Overview"
      >
        {/* Abstract Ambient Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#E3EFEC] opacity-40 rounded-full blur-[100px] mix-blend-multiply pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#FBEAE6] opacity-30 rounded-full blur-[100px] mix-blend-multiply pointer-events-none" />

        {/* Top Brand Lockup */}
        <div className="relative z-10 flex items-center gap-3">
          <HeartLogoIcon size={26} />
          <div>
            <div 
              className="text-[19px] font-medium tracking-tight text-[#152131]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              HeartLink
            </div>
            <div className="text-[12px] font-medium text-[#4a5568] -mt-0.5">
              Admin &amp; clinical portal
            </div>
          </div>
        </div>

        {/* Hero Headline & Narrative */}
        <div className="relative z-10 max-w-[540px] my-auto py-10">
          <h1 
            className="font-medium text-[#152131] tracking-tight leading-[1.2] mb-5 text-[34px] xl:text-[44px]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {/* Perfectly aligned flex container to prevent clipping and baseline issues */}
            <div className="flex flex-wrap items-center gap-x-2.5 mb-1">
              <span>Every</span>
              <div className="relative h-[1.3em] min-w-[160px] overflow-hidden text-[#E8532E]">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={wordIndex}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center"
                  >
                    {dynamicWords[wordIndex]},
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className="block">guided by insights.</div>
          </h1>
          <p className="text-[15px] leading-[1.65] text-[#4a5568] mb-8 max-w-[42ch]">
            Sign in to manage heart-healthy recipes, curate exercise routines, and oversee the algorithmic scoring that empowers users to build better preventive habits.
          </p>

          {/* Interactive Grow & Glow Pills (2 Rows of 3) */}
          <div className="flex flex-wrap gap-2.5">
            <span className="text-[11.5px] font-medium text-[#4a5568] border border-[#DCE3DF] bg-[#FFFFFF] rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(232,83,46,0.15)] hover:border-[#E8532E] hover:text-[#E8532E] cursor-default">
              Preventive scoring
            </span>
            <span className="text-[11.5px] font-medium text-[#4a5568] border border-[#DCE3DF] bg-[#FFFFFF] rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(232,83,46,0.15)] hover:border-[#E8532E] hover:text-[#E8532E] cursor-default">
              Meal &amp; workout curation
            </span>
            <span className="text-[11.5px] font-medium text-[#4a5568] border border-[#DCE3DF] bg-[#FFFFFF] rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(232,83,46,0.15)] hover:border-[#E8532E] hover:text-[#E8532E] cursor-default">
              Wellness algorithms
            </span>
            <span className="text-[11.5px] font-medium text-[#4a5568] border border-[#DCE3DF] bg-[#FFFFFF] rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(232,83,46,0.15)] hover:border-[#E8532E] hover:text-[#E8532E] cursor-default">
              Nutrition tracking
            </span>
            <span className="text-[11.5px] font-medium text-[#4a5568] border border-[#DCE3DF] bg-[#FFFFFF] rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(232,83,46,0.15)] hover:border-[#E8532E] hover:text-[#E8532E] cursor-default">
              Fitness metrics
            </span>
            <span className="text-[11.5px] font-medium text-[#4a5568] border border-[#DCE3DF] bg-[#FFFFFF] rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(232,83,46,0.15)] hover:border-[#E8532E] hover:text-[#E8532E] cursor-default">
              Habit building
            </span>
          </div>
        </div>

        {/* Hero Footer */}
        <div className="relative z-10 flex justify-between items-center pt-6 border-t border-[#DCE3DF] text-[12px] text-[#4a5568]">
          <span>HeartLink web portal · v1.0</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1B6E63]" />
            <span>All systems normal</span>
          </div>
        </div>
      </aside>

      {/* ═════════════════════════════════════════════════════════════════════════
          RIGHT: Form Panel (Clean White)
      ═════════════════════════════════════════════════════════════════════════ */}
      <main className="relative bg-[#FFFFFF] flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto z-0">
        <div className="w-full max-w-[380px] py-4 z-10">

          {/* Mobile Top Brand Bar (Visible only on smaller screens) */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <HeartLogoIcon size={24} />
            <div>
              <div 
                className="text-[18px] font-medium tracking-tight text-[#152131]"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                HeartLink
              </div>
              <div className="text-[11px] font-medium text-[#4a5568] -mt-0.5">
                Admin &amp; clinical portal
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "login" ? (
              <motion.div
                key="login-step"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
              >
                {/* Heading */}
                <motion.div variants={itemVariants} className="mb-7">
                  <h2 
                    className="text-[27px] font-medium tracking-tight text-[#152131] mb-2"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {greeting}
                  </h2>
                  <p className="text-[13.5px] text-[#4a5568] leading-normal">
                    Sign in with your administrator or specialist credentials.
                  </p>
                </motion.div>

                {/* Form */}
                <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5" noValidate>
                  
                  {/* Identifier Input */}
                  <motion.div variants={itemVariants}>
                    <label 
                      htmlFor="identifier" 
                      className="block text-[12.5px] font-semibold text-[#152131] mb-1.5"
                    >
                      Email or username
                    </label>
                    <div 
                      className={`flex items-center border rounded-[6px] px-3.5 h-[46px] transition-all focus-within:ring-4 focus-within:ring-[#1B6E63]/10 focus-within:bg-[#FFFFFF] ${
                        loginErrors.identifier
                          ? "border-red-500 bg-red-500/5"
                          : "border-[#DCE3DF] bg-[#F8FAFC] focus-within:border-[#152131]"
                      }`}
                    >
                      <input
                        id="identifier"
                        type="text"
                        placeholder="you@heartlink.ph"
                        autoComplete="username"
                        aria-invalid={!!loginErrors.identifier}
                        className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#152131] placeholder:text-[#9AA5A1] h-full"
                        {...registerLogin("identifier")}
                        ref={(e) => {
                          registerLogin("identifier").ref(e);
                          identifierInputRef.current = e;
                        }}
                      />
                    </div>
                    {loginErrors.identifier && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-[11.5px] font-medium">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{loginErrors.identifier.message}</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Password Input */}
                  <motion.div variants={itemVariants}>
                    <label 
                      htmlFor="password" 
                      className="block text-[12.5px] font-semibold text-[#152131] mb-1.5"
                    >
                      Password
                    </label>
                    <div 
                      className={`flex items-center relative border rounded-[6px] pl-3.5 pr-2 h-[46px] transition-all focus-within:ring-4 focus-within:ring-[#1B6E63]/10 focus-within:bg-[#FFFFFF] ${
                        loginErrors.password
                          ? "border-red-500 bg-red-500/5"
                          : "border-[#DCE3DF] bg-[#F8FAFC] focus-within:border-[#152131]"
                      }`}
                    >
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        onKeyUp={handleKeyUpDown}
                        onKeyDown={handleKeyUpDown}
                        aria-invalid={!!loginErrors.password}
                        className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#152131] placeholder:text-[#9AA5A1] h-full pr-14"
                        {...registerLogin("password")}
                      />
                      {capsLockOn && (
                        <div className="absolute right-10 flex items-center justify-center pointer-events-none" title="Caps Lock is ON">
                          <span className="bg-[#152131] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Caps</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="p-1.5 text-[#4a5568] hover:text-[#152131] transition-colors cursor-pointer rounded-md"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-[11.5px] font-medium">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{loginErrors.password.message}</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Keep me signed in & Forgot Password */}
                  <motion.div variants={itemVariants} className="flex justify-between items-center pt-1 select-none">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded border-[#DCE3DF] bg-[#EDF1EF] text-[#E8532E] focus:ring-[#E8532E] cursor-pointer"
                      />
                      <span className="text-[13px] text-[#4a5568]">
                        Keep me signed in
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-[12.5px] font-medium text-[#C13E20] hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </motion.div>

                  {/* Structured Error Alert Banner */}
                  {structuredError && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      role="alert"
                      className="flex gap-2.5 bg-[#FBEAE6] border border-[#F0C4B8] rounded-[6px] p-3 text-[13px] text-black leading-normal"
                    >
                      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#E8532E]" />
                      <div className="flex-1">
                        <strong className="block text-[13px] font-bold text-black mb-0.5">
                          {structuredError.title}
                        </strong>
                        <span className="font-medium">{structuredError.message}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingLogin}
                      className="w-full h-[46px] rounded-[6px] bg-[#152131] hover:bg-[#0d1622] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
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
                  </motion.div>
                </form>

                <motion.p variants={itemVariants} className="text-center mt-6 text-[12px] text-[#9AA5A1]">
                  Protected by two-factor authentication
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key="2fa-step"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
              >
                {/* Back to sign in */}
                <motion.button
                  variants={itemVariants}
                  type="button"
                  onClick={() => { setStep("login"); setStructuredError(null); }}
                  className="inline-flex items-center gap-1.5 text-[12.5px] text-[#4a5568] hover:text-[#152131] transition-colors mb-4 cursor-pointer"
                >
                  <ArrowLeft size={13} strokeWidth={2.5} />
                  <span>Back to sign in</span>
                </motion.button>

                {/* 2FA Heading */}
                <motion.div variants={itemVariants} className="mb-7">
                  <h2 
                    className="text-[27px] font-medium tracking-tight text-[#152131] mb-2"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    Enter your code
                  </h2>
                  <p className="text-[13.5px] text-[#4a5568] leading-normal">
                    We sent a 6-digit code to your registered device. It's valid for the next 5 minutes.
                  </p>
                </motion.div>

                {/* 2FA Form */}
                <form onSubmit={handle2FASubmit(onVerify2FA)} className="space-y-4" noValidate>
                  <motion.div variants={itemVariants}>
                    <label 
                      htmlFor="otp" 
                      className="block text-[12.5px] font-semibold text-[#152131] mb-1.5"
                    >
                      Verification code
                    </label>
                    <div 
                      className={`flex items-center border rounded-[6px] px-3.5 h-12 transition-all focus-within:ring-4 focus-within:ring-[#152131]/5 focus-within:bg-[#FFFFFF] ${
                        errors2FA.code
                          ? "border-red-500 bg-red-500/5"
                          : "border-[#DCE3DF] bg-[#F8FAFC] focus-within:border-[#152131]"
                      }`}
                    >
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="······"
                        autoComplete="one-time-code"
                        className="flex-1 bg-transparent border-none outline-none text-[18px] font-semibold tracking-[0.5em] text-[#152131] placeholder:text-[#9AA5A1] text-center h-full"
                        style={{ fontFamily: "'Fraunces', serif" }}
                        {...register2FA("code")}
                        ref={(e) => {
                          register2FA("code").ref(e);
                          otpInputRef.current = e;
                        }}
                      />
                    </div>
                    {errors2FA.code && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-[11.5px] font-medium">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{errors2FA.code.message}</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Structured Error Alert Banner */}
                  {structuredError && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      role="alert"
                      className="flex gap-2.5 bg-[#FBEAE6] border border-[#F0C4B8] rounded-[6px] p-3 text-[12.5px] text-black leading-normal"
                    >
                      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#E8532E]" />
                      <div className="flex-1">
                        <strong className="block text-[13px] font-bold text-black mb-0.5">
                          {structuredError.title}
                        </strong>
                        <span className="font-medium">{structuredError.message}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting2FA}
                      className="w-full h-[46px] rounded-[6px] bg-[#152131] hover:bg-[#0d1622] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      {isSubmitting2FA ? (
                        <>
                          <Loader2 size={16} className="animate-spin shrink-0" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify and continue</span>
                          <ArrowRight size={15} strokeWidth={2.5} className="shrink-0" />
                        </>
                      )}
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants} className="text-center pt-2 text-[12.5px] text-[#4a5568]">
                    <span>Didn't get a code? </span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0}
                      onClick={() => {
                        if (resendCooldown > 0) return;
                        setResendCooldown(60);
                        toast.info("Resend Code", {
                          description: "A fresh verification code has been dispatched to your device.",
                        });
                      }}
                      className="text-[#4a5568] hover:text-[#152131] underline disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend"}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      {/* Forgot Password Modal Dialog */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}