import React from "react";
import {
  HeartPulse,
  ArrowRight,
  ScanBarcode,
  TrendingUp,
  MapPin,
  ChevronRight,
  Activity,
  Smartphone,
  CheckCircle2,
  Apple,
  Play,
} from "lucide-react";
import { Link } from "react-router-dom";

const HeartLinkLanding = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="bg-[#1e4ed8] text-white p-2 rounded-lg flex items-center justify-center">
              <HeartPulse size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[#1e4ed8] text-xl font-bold tracking-tight">
              HeartLink
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a
              href="#features"
              className="hover:text-[#1e4ed8] transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#1e4ed8] transition-colors"
            >
              How it Works
            </a>
            <a
              href="#download"
              className="hover:text-[#1e4ed8] transition-colors"
            >
              Download App
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <button className="hidden md:block text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Log In
              </button>
            </Link>
            <button className="bg-[#1e4ed8] hover:bg-[#1643c3] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-900/20 flex items-center gap-2">
              Get the App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50 opacity-50 rounded-full blur-3xl -mr-[300px] -mt-[150px] -z-10"></div>

        <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="w-full lg:w-1/2 flex flex-col items-start text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#1e4ed8] text-[10px] font-bold tracking-widest uppercase mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1e4ed8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1e4ed8]"></span>
              </span>
              Your Daily Heart Companion
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-[1.15] mb-5 tracking-tight">
              Proactive Heart Health,{" "}
              <span className="text-[#1e4ed8]">Simplified.</span>
            </h1>

            <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-md">
              Take control of your cardiovascular well-being. Track your diet,
              log daily symptoms, and receive adaptive lifestyle recommendations
              all in one smart mobile app.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <a href="#download" className="w-full sm:w-auto bg-[#1643c3] hover:bg-[#113296] text-white text-sm font-semibold rounded-xl px-6 py-3.5 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                Download for Free
                <ArrowRight size={18} strokeWidth={2.5} />
              </a>
              <a href="#how-it-works" className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-sm font-semibold rounded-xl px-6 py-3.5 flex items-center justify-center transition-all">
                See How It Works
              </a>
            </div>
          </div>

          {/* Hero Visuals / App Widget Simulation */}
          <div className="w-full lg:w-1/2 relative h-[380px] lg:h-[450px] flex items-center justify-center">
            {/* Main Widget */}
            <div className="absolute z-20 bg-white p-5 rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 w-72 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Stability Score
                  </h3>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                    Today's Vitals
                  </p>
                </div>
                <div className="h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center text-[#1e4ed8]">
                  <Activity size={16} strokeWidth={2.5} />
                </div>
              </div>

              <div className="flex items-end gap-2 mb-5">
                <span className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
                  85
                </span>
                <span className="text-sm font-bold text-gray-400 mb-1">
                  /100
                </span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-400 to-[#1e4ed8] h-2.5 rounded-full w-[85%] relative">
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/30 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs font-bold text-[#1e4ed8] text-right">
                Stable & Optimal
              </p>
            </div>

            {/* Secondary Floating Widget */}
            <div className="absolute z-30 bottom-10 right-4 lg:right-12 bg-white p-3 rounded-2xl shadow-xl shadow-blue-900/10 border border-blue-50 w-56 transform rotate-3 hover:rotate-0 hover:-translate-y-1.5 transition-all duration-500">
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Meal Scanned
                  </p>
                  <p className="text-xs font-bold text-gray-900 leading-tight">
                    Low Sodium Matched
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative blob behind the cards */}
            <div className="absolute inset-4 lg:inset-8 bg-gradient-to-r from-blue-100 to-indigo-50 rounded-[2.5rem] -z-10 blur-xl opacity-60"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-20 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-[10px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-2">
              App Features
            </h2>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Built for your daily awareness.
            </h3>
            <p className="text-sm text-gray-600">
              Everything you need to build healthier habits, understand your
              risk factors, and stay connected to care when it matters.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 lg:p-8 rounded-3xl bg-[#f8fafc] border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all group">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 mb-5 group-hover:bg-[#1e4ed8] group-hover:text-white transition-colors text-[#1e4ed8]">
                <ScanBarcode size={24} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Smart Diet Tracking
              </h4>
              <p className="text-gray-600 leading-relaxed text-xs">
                Instantly scan food barcodes to evaluate nutritional value and
                receive precautionary alerts when you exceed sodium or saturated
                fat limits.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 lg:p-8 rounded-3xl bg-[#f8fafc] border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all group">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 mb-5 group-hover:bg-[#1e4ed8] group-hover:text-white transition-colors text-[#1e4ed8]">
                <TrendingUp size={24} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Adaptive CSS Scoring
              </h4>
              <p className="text-gray-600 leading-relaxed text-xs">
                Log daily symptoms and vitals. Our rule-based engine calculates
                your Cardiovascular Stability Score to offer personalized
                recipes and low-intensity workouts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 lg:p-8 rounded-3xl bg-[#f8fafc] border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all group">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 mb-5 group-hover:bg-[#1e4ed8] group-hover:text-white transition-colors text-[#1e4ed8]">
                <MapPin size={24} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Specialist Locator
              </h4>
              <p className="text-gray-600 leading-relaxed text-xs">
                If your health logs indicate escalating risks, the app
                automatically triggers a map-based locator to help you find
                cardiologists in your area.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-[10px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-2">
              Simple Process
            </h2>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              How HeartLink Works
            </h3>
            <p className="text-sm text-gray-600">
              Start managing your cardiovascular health in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting lines for desktop */}
            <div className="hidden md:block absolute top-10 left-[16.6%] right-[16.6%] h-[1px] bg-blue-100 z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-[3px] border-blue-50 shadow-sm text-[#1e4ed8] mb-5">
                <Smartphone size={28} />
              </div>
              <div className="bg-blue-50 text-[#1e4ed8] font-bold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full mb-3">
                Step 01
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Setup Your Profile
              </h4>
              <p className="text-gray-600 text-xs leading-relaxed max-w-xs">
                Download the app, enter your baseline metrics, and customize
                your personal health goals.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-[3px] border-blue-50 shadow-sm text-[#1e4ed8] mb-5">
                <ScanBarcode size={28} />
              </div>
              <div className="bg-blue-50 text-[#1e4ed8] font-bold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full mb-3">
                Step 02
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Track & Scan
              </h4>
              <p className="text-gray-600 text-xs leading-relaxed max-w-xs">
                Log your daily symptoms and scan grocery barcodes to ensure your
                diet stays heart-healthy.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-[3px] border-blue-50 shadow-sm text-[#1e4ed8] mb-5">
                <Activity size={28} />
              </div>
              <div className="bg-blue-50 text-[#1e4ed8] font-bold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full mb-3">
                Step 03
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Adapt & Improve
              </h4>
              <p className="text-gray-600 text-xs leading-relaxed max-w-xs">
                Watch your Stability Score adjust in real-time, giving you
                personalized exercise and dietary advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-16 lg:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-[#1e4ed8] rounded-[2rem] p-10 md:p-12 text-center relative overflow-hidden shadow-2xl shadow-blue-900/20">
            {/* Decorative background rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/10 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-white/5 rounded-full"></div>

            <div className="relative z-10 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Ready to prioritize your heart?
              </h2>
              <p className="text-blue-100/90 mb-8 text-sm leading-relaxed">
                Join thousands of users tracking their cardiovascular health
                daily. Download HeartLink today and take the first step towards
                a healthier you.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* App Store Button */}
                <button className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white rounded-xl px-5 py-3 flex items-center justify-center gap-2.5 transition-all transform hover:scale-105">
                  <Apple size={24} />
                  <div className="text-left">
                    <div className="text-[9px] uppercase tracking-wider text-gray-300 font-semibold leading-none mb-0.5">
                      Download on the
                    </div>
                    <div className="text-base font-bold leading-none">
                      App Store
                    </div>
                  </div>
                </button>

                {/* Google Play Button */}
                <button className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-900 rounded-xl px-5 py-3 flex items-center justify-center gap-2.5 transition-all transform hover:scale-105 shadow-lg">
                  <Play size={20} className="text-[#1e4ed8]" />
                  <div className="text-left">
                    <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold leading-none mb-0.5">
                      GET IT ON
                    </div>
                    <div className="text-base font-bold leading-none">
                      Google Play
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] py-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <HeartPulse size={18} className="text-white" />
          <span className="text-white text-base font-bold tracking-tight">
            HeartLink
          </span>
        </div>
        <p className="text-gray-500 text-xs">
          © 2026 HeartLink. A Proactive Cardiovascular Wellness Tool.
        </p>
      </footer>
    </div>
  );
};

export default HeartLinkLanding;