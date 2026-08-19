import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";
import { Button } from "../../components/ui/Button";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const twoFASchema = z.object({
  code: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
});

// ─── Heart Icon (matches brand logo — thin outline, no fill) ─────────────────
function HeartOutlineIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ─── Brand Logo lockup ────────────────────────────────────────────────────────
function BrandLogo({ dark = false }) {
  const text = dark ? "#0f172a" : "#ffffff";
  const sub  = dark ? "rgba(15,23,42,0.4)" : "rgba(255,255,255,0.4)";
  return (
    <div className="flex flex-col items-center gap-5">
      {/* Circle icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center border-2"
        style={{ borderColor: dark ? "rgba(15,23,42,0.15)" : "rgba(255,255,255,0.35)", backgroundColor: "transparent" }}
      >
        <HeartOutlineIcon size={34} color={dark ? "#0f172a" : "#ffffff"} />
      </div>
      {/* Wordmark */}
      <div className="text-center">
        <p className="leading-none" style={{ fontSize: 38, letterSpacing: -1, color: text }}>
          <span style={{ fontWeight: 300 }}>Heart</span>
          <span style={{ fontWeight: 700 }}>Link</span>
          <span style={{ fontWeight: 700 }}>.</span>
        </p>
        <p className="mt-3 tracking-[0.22em] text-[10px] uppercase" style={{ color: sub, fontWeight: 400 }}>
          Cardiovascular Well-Being
        </p>
      </div>
    </div>
  );
}


// ─── Admin Login ──────────────────────────────────────────────────────────────
export default function HeartLinkAdminLogin() {
  const [step, setStep] = useState("login"); // "login" or "2fa"
  const [temp2faToken, setTemp2faToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors, isSubmitting: isSubmittingLogin } } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  const { register: register2FA, handleSubmit: handle2FASubmit, formState: { errors: errors2FA, isSubmitting: isSubmitting2FA } } = useForm({
    resolver: zodResolver(twoFASchema),
    mode: "onTouched",
  });

  const onLogin = async (data) => {
    setGlobalError(null);
    try {
      const response = await apiFetch("/api/auth/web-login", {
        method: "POST",
        body: JSON.stringify({
          identifier: data.email,
          password: data.password,
          remember: remember,
        }),
      });
      
      if (response.success && response.requires_2fa) {
        setTemp2faToken(response.token_2fa);
        setStep("2fa");
      } else if (response.success) {
        // Fallback if backend hasn't been updated to 2FA yet
        login(response.user_id, response.token, { id: response.user_id, role: response.role }, remember);
        navigate("/dashboard");
      }
    } catch (error) {
      setGlobalError(error.data?.detail || "Login failed. Please try again.");
    }
  };

  const onVerify2FA = async (data) => {
    setGlobalError(null);
    try {
      const response = await apiFetch("/api/auth/web-login/verify-2fa", {
        method: "POST",
        body: JSON.stringify({
          token_2fa: temp2faToken,
          code: data.code,
        }),
      });
      
      if (response.success) {
        login(response.user_id, response.token, { id: response.user_id, role: response.role }, remember);
        navigate("/dashboard");
      }
    } catch (error) {
      setGlobalError(error.data?.detail || "Invalid code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Left panel — brand showcase ── */}
      <div
        className="hidden lg:flex w-1/2 flex-col items-center justify-center p-16 relative"
        style={{ backgroundColor: "#0d1424" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(30,78,216,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-xs text-center">
          <BrandLogo dark={false} />
          <div className="w-10 h-px my-10" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
            Centralised administration suite for real-time cardiac monitoring, predictive alerts, and user data orchestration.
          </p>
          <div
            className="mt-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] tracking-widest uppercase"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}
          >
            v 1.0.0
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-14 bg-white relative">
        
        {step === "2fa" && (
          <button 
            onClick={() => { setStep("login"); setGlobalError(null); }}
            className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to login
          </button>
        )}

        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-12">
            <BrandLogo dark={true} />
          </div>

          {step === "login" ? (
            <>
              {/* Heading */}
              <div className="mb-9 relative">
                <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-slate-400 mb-2">
                  Secure gateway
                </p>
                <div className="absolute top-4 right-0 flex items-center gap-1 text-[9px] text-slate-400">
                  <Lock size={10} />
                  <span>End-to-end encrypted connection</span>
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
                  Admin login
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Verify your credentials to access the admin dashboard.
                </p>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleLoginSubmit(onLogin)}>
                <InputField
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="name@heartlink.ph"
                  left={<Mail size={15} />}
                  error={loginErrors.email}
                  {...registerLogin("email")}
                />

                <InputField
                  id="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  hint="Forgot?"
                  onHintClick={(e) => {
                    e.preventDefault();
                    setGlobalError("For security reasons, please contact your system administrator to reset your credentials.");
                  }}
                  left={<Lock size={15} />}
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  error={loginErrors.password}
                  {...registerLogin("password")}
                />

                {/* Remember me */}
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border border-slate-200 rounded bg-white checked:bg-slate-900 checked:border-slate-900 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                    <svg
                      className="absolute inset-0 m-auto w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                      viewBox="0 0 14 10" fill="none"
                    >
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-xs text-slate-500 group-hover:text-slate-800 transition-colors">
                    Keep me signed in
                  </span>
                </label>

                {globalError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                    <p className="text-xs text-red-600 leading-relaxed font-medium">{globalError}</p>
                  </div>
                )}

                {/* Submit */}
                <div>
                  <Button
                    type="submit"
                    isLoading={isSubmittingLogin}
                    loadingText="Authenticating..."
                    className="w-full"
                  >
                    Continue
                    <ArrowRight size={15} strokeWidth={2} />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* 2FA Heading */}
              <div className="mb-9 relative">
                <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-slate-400 mb-2">
                  Two-Factor Verification
                </p>
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
                  Enter Secure Code
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We've sent a 6-digit verification code to your device. Please enter it below to securely access the dashboard.
                </p>
              </div>

              {/* 2FA Form */}
              <form className="space-y-6" autoComplete="off" onSubmit={handle2FASubmit(onVerify2FA)}>
                {/* Dummy inputs to trap aggressive browser autofill */}
                <input type="email" name="dummy_email" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                <input type="password" name="dummy_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                
                <InputField
                  id="otp-verification-code"
                  label="Verification Code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="one-time-code"
                  style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.25rem', padding: '1rem' }}
                  left={<KeyRound size={15} />}
                  error={errors2FA.code}
                  {...register2FA("code")}
                />

                {globalError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                    <p className="text-xs text-red-600 leading-relaxed font-medium">{globalError}</p>
                  </div>
                )}

                {/* Submit */}
                <div>
                  <Button
                    type="submit"
                    isLoading={isSubmitting2FA}
                    loadingText="Verifying..."
                    className="w-full"
                  >
                    Verify & Access Dashboard
                    <ArrowRight size={15} strokeWidth={2} />
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-300 tracking-wide">
              © 2026 HeartLink System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}