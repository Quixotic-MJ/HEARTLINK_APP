import React from 'react';
import { 
  Activity, 
  ArrowRight, 
  ShieldCheck, 
  HeartPulse, 
  BarChart3, 
  Network,
  ChevronRight
} from 'lucide-react';

const HeartLinkLanding = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="bg-[#1e4ed8] text-white p-2 rounded-lg flex items-center justify-center">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[#1e4ed8] text-xl font-bold tracking-tight">HeartLink</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-[#1e4ed8] transition-colors">Features</a>
            <a href="#security" className="hover:text-[#1e4ed8] transition-colors">Security</a>
            <a href="#about" className="hover:text-[#1e4ed8] transition-colors">About Us</a>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden md:block text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              Request Demo
            </button>
            <button className="bg-[#1e4ed8] hover:bg-[#1643c3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-900/20 flex items-center gap-2">
              Client Portal
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50 opacity-50 rounded-full blur-3xl -mr-[400px] -mt-[200px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#1e4ed8] text-xs font-bold tracking-wide uppercase mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1e4ed8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1e4ed8]"></span>
              </span>
              v2.4.0 Now Live
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
              Precision Cardiac Care, <span className="text-[#1e4ed8]">Centralized.</span>
            </h1>
            
            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
              Empower your clinical team with real-time cardiac monitoring, enterprise-grade data orchestration, and predictive patient analytics.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-[#1643c3] hover:bg-[#113296] text-white font-semibold rounded-xl px-8 py-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 text-lg">
                Start Free Trial
                <ArrowRight size={20} strokeWidth={2.5} />
              </button>
              <button className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold rounded-xl px-8 py-4 flex items-center justify-center transition-all text-lg">
                View Documentation
              </button>
            </div>
          </div>

          {/* Hero Visuals / Stats (Borrowing the aesthetic from the login page) */}
          <div className="w-full lg:w-1/2 relative">
            <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100 relative z-10">
              <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">System Overview</h3>
                  <p className="text-sm text-gray-500">Live monitoring network status</p>
                </div>
                <Activity className="text-[#1e4ed8]" size={28} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-gray-100">
                  <p className="text-3xl font-bold text-[#1e4ed8] mb-2">99.9%</p>
                  <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">System Uptime</p>
                </div>
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-gray-100">
                  <p className="text-3xl font-bold text-[#1e4ed8] mb-2">AES-256</p>
                  <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">Encryption</p>
                </div>
                <div className="bg-[#f8fafc] p-6 rounded-2xl border border-gray-100 col-span-2 flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-colors">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">12,408</p>
                    <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">Active Patients Monitored</p>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-[#1e4ed8] transition-colors" />
                </div>
              </div>
            </div>
            
            {/* Decorative blob behind the card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-50 rounded-[2.5rem] -z-10 blur-lg opacity-60"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-3">Clinical Features</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Built for modern cardiology teams.</h3>
            <p className="text-gray-600">Everything you need to orchestrate patient data, monitor vitals in real-time, and ensure absolute regulatory compliance.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-[#f8fafc] border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50 transition-all group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 mb-6 group-hover:bg-[#1e4ed8] group-hover:text-white transition-colors text-[#1e4ed8]">
                <HeartPulse size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Real-Time Telemetry</h4>
              <p className="text-gray-600 leading-relaxed text-sm">Stream continuous ECG data directly to the clinical dashboard with sub-second latency.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-[#f8fafc] border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50 transition-all group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 mb-6 group-hover:bg-[#1e4ed8] group-hover:text-white transition-colors text-[#1e4ed8]">
                <ShieldCheck size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">HIPAA Compliant</h4>
              <p className="text-gray-600 leading-relaxed text-sm">End-to-end AES-256 encryption ensures all patient health information remains strictly confidential.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-[#f8fafc] border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50 transition-all group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 mb-6 group-hover:bg-[#1e4ed8] group-hover:text-white transition-colors text-[#1e4ed8]">
                <Network size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">EHR Integration</h4>
              <p className="text-gray-600 leading-relaxed text-sm">Seamlessly push and pull records from Epic, Cerner, and other major Electronic Health Record systems.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-[#0f172a] py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-6 opacity-50">
          <Activity size={20} className="text-white" />
          <span className="text-white text-lg font-bold tracking-tight">HeartLink</span>
        </div>
        <p className="text-gray-500 text-sm">© 2024 HeartLink Medical Systems. Precision v2.4.0</p>
      </footer>

    </div>
  );
};

export default HeartLinkLanding;