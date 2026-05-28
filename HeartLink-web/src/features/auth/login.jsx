import React, { useState } from "react";
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

const HeartLinkLogin = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    /* Outer Container */
    <div className="flex min-h-screen w-full bg-white overflow-hidden font-sans text-gray-900">
      
      {/* Left Panel - Brand Showcase (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex w-1/2 bg-slate-50 relative items-center justify-center p-12 overflow-hidden border-r border-gray-100">
        
        {/* Decorative Background Elements (Lighter, subtle) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="relative z-10 max-w-md w-full">
          {/* Logo & Version Tag */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#1e4ed8] text-white p-2 rounded-lg flex items-center justify-center shadow-md shadow-blue-900/20">
                <HeartPulse size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col cursor-pointer">
                <span className="text-gray-900 text-xl font-bold tracking-tight leading-none">
                  Heart<span className="text-[#1e4ed8]">Link</span>
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#1e4ed8] text-[9px] font-bold tracking-widest uppercase">
              v1.0.0
            </div>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-gray-900 mb-5 leading-[1.15] tracking-tight">
            Precision Portal for{" "}
            <span className="text-[#1e4ed8]">Clinical Excellence.</span>
          </h2>

          <p className="text-gray-600 text-sm xl:text-base leading-relaxed max-w-[90%]">
            Access the centralized administration suite for real-time cardiac
            monitoring, predictive alerts, and patient data orchestration.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        
        {/* Subtle background blob for right side (Mobile Only) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl -z-10 lg:hidden pointer-events-none"></div>

        <div className="w-full max-w-[380px] relative z-10">

          {/* Mobile Logo (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <div className="bg-[#1e4ed8] text-white p-2 rounded-lg flex items-center justify-center shadow-md shadow-blue-900/20">
              <HeartPulse size={20} strokeWidth={2.5} />
            </div>
            <span className="text-gray-900 text-2xl font-bold tracking-tight leading-none">
              Heart<span className="text-[#1e4ed8]">Link</span>
            </span>
          </div>

          <div className="text-left mb-8">
            <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
              Secure Gateway
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Admin Login
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              Please verify your credentials to continue to the Clinical Atelier
              dashboard.
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-4">
            
            <div>
              <label
                className="block text-[10px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide"
                htmlFor="email"
              >
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  id="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e4ed8]/20 focus:border-[#1e4ed8] transition-all outline-none text-gray-900 placeholder-gray-400 text-sm shadow-sm"
                  placeholder="name@clinicalatelier.co"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-[10px] font-bold text-[#1e4ed8] hover:text-[#113296] hover:underline transition-colors"
                >
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e4ed8]/20 focus:border-[#1e4ed8] transition-all outline-none text-gray-900 placeholder-gray-400 text-sm shadow-sm tracking-wider"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                <div className="relative flex items-center justify-center w-4 h-4">
                  <input
                    type="checkbox"
                    className="peer appearance-none w-4 h-4 border border-gray-300 rounded bg-white text-[#1e4ed8] focus:ring-[#1e4ed8] focus:ring-2 focus:ring-offset-1 checked:bg-[#1e4ed8] checked:border-[#1e4ed8] transition-all cursor-pointer"
                  />
                  <svg
                    className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
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
                <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors select-none">
                  Remember my credentials
                </span>
              </label>
            </div>

            {/* Styled Link instead of nested button */}
            <div className="pt-4">
              <Link
                to="/dashboard"
                className="w-full bg-[#1643c3] hover:bg-[#113296] text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 text-sm"
              >
                Log In to Dashboard
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
            
          </form>

          {/* Footer inside right panel */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-4">
            <p className="text-[10px] text-gray-400 font-medium">
              © 2026 HeartLink System. All rights reserved.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default HeartLinkLogin;