import React, { useState, useRef } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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

// ─── 2FA Login ──────────────────────────────────────────────────────────────
export default function TwoFactorAuth() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && isNaN(Number(value))) return;

    const newOtp = [...otp];
    // Take just the last typed character
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input automatically if a number was typed
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current is empty
    if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus on the next empty input or the last one
      const focusIndex = Math.min(pastedData.length, 5);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
      }
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

      {/* ── Right panel — 2FA form ── */}
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
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enter the 6-digit code from your authenticator app to access the clinical dashboard.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>

            {/* OTP Input Component */}
            <div>
              <div className="flex justify-between items-center gap-2 mb-4" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-lg font-medium text-center text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5 placeholder-slate-300"
                    placeholder="•"
                  />
                ))}
              </div>
              
              <div className="text-center">
                <a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium">
                  Use a recovery code
                </a>
              </div>
            </div>

            {/* Submit */}
            <div>
              <Link
                to="/dashboard"
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ backgroundColor: "#0f172a" }}
              >
                Verify & Access Dashboard
                <ArrowRight size={15} strokeWidth={2} />
              </Link>
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
