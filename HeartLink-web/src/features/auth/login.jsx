import React, { useState } from "react";
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Activity,
} from "lucide-react";

import { Link } from "react-router-dom";

const HeartLinkLogin = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    /* Outer Container */
    <div className="flex min-h-screen w-full bg-white">
      {/* Left Panel - Brand Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-50 relative items-center justify-center p-12 overflow-hidden border-r border-gray-100">
        {/* Decorative Background Elements (Lighter, subtle) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="relative z-10 max-w-lg w-full">
          {/* Logo & Version Tag */}
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="bg-[#1e4ed8] text-white p-2.5 rounded-lg flex items-center justify-center shadow-md shadow-blue-900/10">
                <Activity size={24} strokeWidth={2.5} />
              </div>
              <span className="text-[#1e4ed8] text-2xl font-bold tracking-tight">
                HeartLink
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#1e4ed8] text-[10px] font-bold tracking-wide uppercase">
              v1.0.0
            </div>
          </div>

          <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight">
            Precision Portal for{" "}
            <span className="text-[#1e4ed8]">Clinical Excellence.</span>
          </h2>

          <p className="text-gray-600 text-lg mb-12 leading-relaxed max-w-md">
            Access the centralized administration suite for real-time cardiac
            monitoring and patient data orchestration.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle background blob for right side */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-3xl -z-10 lg:hidden"></div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* Back to Landing Page Button */}
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#1e4ed8] transition-colors mb-8 sm:mb-10 group"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Back to landing page
          </a>

          {/* Mobile Logo (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-10">
            <div className="bg-[#1e4ed8] text-white p-2.5 rounded-lg flex items-center justify-center shadow-md">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[#1e4ed8] text-2xl font-bold tracking-tight">
              HeartLink
            </span>
          </div>

          <div className="text-left mb-10">
            <p className="text-[11px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-2">
              {/* Secure Gateway */}
            </p>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Admin Login
            </h1>
            <p className="text-gray-500 text-sm">
              Please verify your credentials to continue to the Clinical Atelier
              dashboard.
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-5">
            <div>
              <label
                className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide"
                htmlFor="email"
              >
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  id="email"
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e4ed8]/20 focus:border-[#1e4ed8] transition-all outline-none text-gray-900 placeholder-gray-400 text-sm shadow-sm"
                  placeholder="name@clinicalatelier.co"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-bold text-[#1e4ed8] hover:text-[#113296] hover:underline transition-colors"
                >
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="w-full pl-11 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e4ed8]/20 focus:border-[#1e4ed8] transition-all outline-none text-gray-900 placeholder-gray-400 text-sm shadow-sm tracking-widest"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="checkbox"
                    className="peer appearance-none w-5 h-5 border-2 border-gray-200 rounded bg-white text-[#1e4ed8] focus:ring-[#1e4ed8] focus:ring-2 focus:ring-offset-2 checked:bg-[#1e4ed8] checked:border-[#1e4ed8] transition-all cursor-pointer"
                  />
                  <svg
                    className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                    viewBox="0 0 14 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 5L4.5 8.5L13 1"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors select-none">
                  Remember my credentials
                </span>
              </label>
            </div>

            {/* Temporary routing */}
            <Link to="/dashboard">
              <button
                type="submit"
                className="w-full bg-[#1643c3] hover:bg-[#113296] text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 mt-8 text-sm"
              >
                Log In to Dashboard
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </Link>
          </form>

          {/* Footer inside right panel */}
          <div className=" pt-8 border-t border-gray-200 flex flex-col items-center gap-4">
            <p className="text-[10px] text-gray-400">
              © 2026 HeartLink System.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeartLinkLogin;
