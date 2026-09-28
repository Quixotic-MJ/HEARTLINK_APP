import React, { useState, useRef } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

// ─── HeartLink Official Brand Emblem ──────────────────────────────────────────
function HeartLogoIcon({ size = 22, className = "" }) {
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
        <linearGradient id="hl-topright" gradientUnits="userSpaceOnUse" x1="0" y1="-122" x2="0" y2="30">
          <stop offset="0" stopColor="#2B84FF"/><stop offset="0.30" stopColor="#2E8DF5"/>
          <stop offset="0.52" stopColor="#38B3B5"/><stop offset="0.68" stopColor="#5CC974"/>
          <stop offset="0.81" stopColor="#B2D65A"/><stop offset="0.91" stopColor="#F7A63C"/>
          <stop offset="1" stopColor="#FF9A2E"/>
        </linearGradient>
        <linearGradient id="hl-bottomleft" gradientUnits="userSpaceOnUse" x1="0" y1="-30" x2="0" y2="122">
          <stop offset="0" stopColor="#2B87FF"/><stop offset="0.45" stopColor="#2A86F5"/>
          <stop offset="0.62" stopColor="#2D9BE0"/><stop offset="0.78" stopColor="#30BE9C"/>
          <stop offset="1" stopColor="#33CC82"/>
        </linearGradient>
        <linearGradient id="hl-bottomright" gradientUnits="userSpaceOnUse" x1="122" y1="0" x2="-32" y2="0">
          <stop offset="0" stopColor="#3FC98A"/><stop offset="0.30" stopColor="#7ACD68"/>
          <stop offset="0.50" stopColor="#B6D85A"/><stop offset="0.70" stopColor="#C2D857"/>
          <stop offset="0.85" stopColor="#F2A93C"/><stop offset="1" stopColor="#FF9A2E"/>
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -79.20,-25.46 L -96.17,-42.43 A 38 38 0 0 1 -42.43,-96.17 L 28.28,-25.46" stroke="#FF4B4B"/>
        <path d="M 25.46,-79.20 L 42.43,-96.17 A 38 38 0 0 1 96.17,-42.43 L 25.46,28.28" stroke="url(#hl-topright)"/>
        <path d="M -25.46,79.20 L -42.43,96.17 A 38 38 0 0 1 -96.17,42.43 L -25.46,-28.28" stroke="url(#hl-bottomleft)"/>
        <path d="M 79.20,25.46 L 96.17,42.43 A 38 38 0 0 1 42.43,96.17 L -28.28,25.46" stroke="url(#hl-bottomright)"/>
      </g>
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
        <HeartLogoIcon size={34} />
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
            Centralised administration suite for real-time cardiac monitoring, predictive alerts, and user data orchestration.
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
              Enter the 6-digit code from your authenticator app to access the admin dashboard.
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
