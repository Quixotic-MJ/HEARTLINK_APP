import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

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

// ─── Input ────────────────────────────────────────────────────────────────────
function Field({
  id, label, type, placeholder, hint, hintHref,
  left, right, value, onChange, error
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={`text-[11px] font-medium uppercase tracking-widest ${error ? 'text-red-500' : 'text-slate-500'}`}>
          {label}
        </label>
        {hint && (
          <a href={hintHref || "#"} className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors">
            {hint}
          </a>
        )}
      </div>
      <div className="relative">
        {left && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
            {left}
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full bg-slate-50 border ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'} rounded-xl text-sm text-slate-900 placeholder-slate-300 outline-none transition-all focus:bg-white focus:ring-2 ${error ? 'focus:ring-red-500/10' : 'focus:ring-slate-900/5'}`}
          style={{ paddingTop: 11, paddingBottom: 11, paddingLeft: left ? 42 : 16, paddingRight: right ? 42 : 16 }}
        />
        {right && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {right}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Admin Login ──────────────────────────────────────────────────────────────
export default function HeartLinkAdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      navigate("/two-factor");
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
          <form className="space-y-5" onSubmit={handleSubmit}>

            <Field
              id="email"
              label="Email"
              type="email"
              placeholder="name@heartlink.ph"
              left={<Mail size={15} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            <Field
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
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

            {/* Submit */}
            <div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ backgroundColor: "#0f172a" }}
              >
                Continue to 2FA Verification
                <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>

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