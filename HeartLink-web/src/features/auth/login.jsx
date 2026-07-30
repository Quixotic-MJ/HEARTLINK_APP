import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setGlobalError(null);
      try {
        const response = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            identifier: data.email,
            password: data.password,
          }),
        });
        
        if (response.success) {
          login(response.user_id);
          // Skipping 2FA for now
          navigate("/dashboard");
        }
      } catch (error) {
        setGlobalError(error.data?.detail || "Login failed. Please try again.");
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Left panel — brand showcase ── */}
      <div
        className="hidden lg:flex w-1/2 flex-col items-center justify-center p-16 relative"
        style={{ backgroundColor: "#0d1424" }}
      >
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(30,78,216,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-xs text-center">
          <BrandLogo dark={false} />

          {/* Divider */}
          <div className="w-10 h-px my-10" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />

          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
            Centralised administration suite for real-time cardiac monitoring, predictive alerts, and patient data orchestration.
          </p>

          {/* Version pill */}
          <div
            className="mt-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] tracking-widest uppercase"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}
          >
            v 1.0.0
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-14 bg-white">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-12">
            <BrandLogo dark={true} />
          </div>

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
              Verify your credentials to access the clinical dashboard.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

            <InputField
              id="email"
              label="Email"
              type="email"
              placeholder="name@heartlink.ph"
              left={<Mail size={15} />}
              error={errors.email}
              {...register("email")}
            />

            <InputField
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              hint="Forgot?"
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
              error={errors.password}
              {...register("password")}
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
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-70"
                style={{ backgroundColor: "#0f172a" }}
              >
                {loading ? "Authenticating..." : "Continue to Dashboard"}
                {!loading && <ArrowRight size={15} strokeWidth={2} />}
              </button>
            </div>

            {/* Dev shortcut */}
            {import.meta.env.DEV && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    login("usr-chief-admin-001", {
                      first_name: "System",
                      last_name: "Admin",
                      email: "admin@heartlink.ph"
                    });
                    navigate("/dashboard");
                  }}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-[13px] font-medium transition-all active:scale-[0.99]"
                  style={{
                    backgroundColor: "rgba(15,23,42,0.05)",
                    color: "rgba(15,23,42,0.7)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(15,23,42,0.08)";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(15,23,42,0.05)";
                    e.currentTarget.style.color = "rgba(15,23,42,0.7)";
                  }}
                >
                  Dev → skip to dashboard
                </button>
              </div>
            )}

          </form>

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