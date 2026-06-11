import React, { useState } from "react";
import {
  Save,
  Settings2,
  ShieldCheck,
  Monitor,
  AlertTriangle,
  Key,
  RefreshCw,
  Clock,
  Database,
  Moon,
  Sun,
  LayoutTemplate,
  Sidebar as SidebarIcon,
  CheckCircle2
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout"; // Adjust path based on your structure

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // General Settings State
  const [systemName, setSystemName] = useState("HeartLink Clinical Portal");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState("15");
  
  // API Keys State
  const [smsGatewayKey, setSmsGatewayKey] = useState("sk_live_••••••••••••••••••••••••");
  const [foodFactsKey, setFoodFactsKey] = useState("off_••••••••••••••••••••••••");

  // Security Settings State
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [auditRetention, setAuditRetention] = useState("365");
  const [maxFailedLogins, setMaxFailedLogins] = useState("5");

  // UI Settings State
  const [theme, setTheme] = useState("system");
  const [sidebarLayout, setSidebarLayout] = useState("expanded");

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    }, 800);
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4 relative">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">
            Administration
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-[1.1] tracking-tight">
            Global <span className="text-[#0f172a]">Settings.</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Saved Notification Toast */}
          <div className={`flex items-center gap-1.5 text-green-600 text-[11px] font-bold transition-opacity duration-300 ${showSavedToast ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 size={14} /> Settings Saved
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-5 py-2 rounded-xl shadow-sm shadow-slate-900/20 transition-colors disabled:opacity-70"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="bg-white p-1 rounded-xl inline-flex flex-wrap shadow-sm border border-slate-100 mb-6 w-full sm:w-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "general" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Settings2 size={14} /> General Config
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "security" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <ShieldCheck size={14} /> Security & Access
        </button>
        <button
          onClick={() => setActiveTab("ui")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "ui" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Monitor size={14} /> User Interface
        </button>
      </div>

      {/* ========================================= */}
      {/* TAB 1: GENERAL CONFIGURATION              */}
      {/* ========================================= */}
      {activeTab === "general" && (
        <div className="space-y-5 animate-in fade-in duration-300 max-w-4xl">
          
          {/* Critical Feature: Maintenance Mode */}
          <div className={`p-5 rounded-xl border transition-colors flex items-start justify-between gap-4 ${maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div>
              <h3 className={`text-sm font-bold flex items-center gap-1.5 mb-1 ${maintenanceMode ? 'text-red-700' : 'text-slate-900'}`}>
                <AlertTriangle size={16} className={maintenanceMode ? 'text-red-600' : 'text-slate-400'} />
                System Maintenance Mode
              </h3>
              <p className={`text-[10px] ${maintenanceMode ? 'text-red-600' : 'text-slate-500'} leading-relaxed max-w-xl`}>
                Activating this locks all mobile app users and standard admins out of the platform. Use only during critical database migrations or severe security incidents.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* System Branding & Operations */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Settings2 size={12} /> System Identity
              </h4>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1.5">Portal Display Name</label>
                <input 
                  type="text" 
                  value={systemName} 
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1.5">Heartbeat Polling Interval</label>
                <p className="text-[9px] text-slate-500 mb-2">Defines how often the frontend pings the database to refresh the "System Status" and "Live Monitoring" feeds.</p>
                <div className="relative">
                  <RefreshCw size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={heartbeatInterval}
                    onChange={(e) => setHeartbeatInterval(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors appearance-none cursor-pointer"
                  >
                    <option value="5">Every 5 Seconds (High Load)</option>
                    <option value="15">Every 15 Seconds (Recommended)</option>
                    <option value="30">Every 30 Seconds</option>
                    <option value="60">Every 1 Minute</option>
                  </select>
                </div>
              </div>
            </div>

            {/* External APIs */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-5">
              <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-1.5">
                <Key size={12} /> External Integrations
              </h4>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1.5">SMS Gateway API Key (e.g., Semaphore/Twilio)</label>
                <p className="text-[9px] text-slate-500 mb-2">Required for sending automated OTPs and account recovery texts.</p>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    value={smsGatewayKey} 
                    onChange={(e) => setSmsGatewayKey(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1.5">Open Food Facts API Key</label>
                <p className="text-[9px] text-slate-500 mb-2">Required for barcode scanning and nutrition sync.</p>
                <div className="relative">
                  <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    value={foodFactsKey} 
                    onChange={(e) => setFoodFactsKey(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 2: SECURITY & ACCESS                  */}
      {/* ========================================= */}
      {activeTab === "security" && (
        <div className="space-y-5 animate-in fade-in duration-300 max-w-4xl">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <ShieldCheck size={12} /> Access Policies
            </h4>
            
            <div className="max-w-md">
              <label className="block text-[11px] font-bold text-slate-900 mb-1.5">Admin Session Timeout</label>
              <p className="text-[9px] text-slate-500 mb-2">Defines how long an admin or expert session stays active in the browser before requiring re-authentication.</p>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes (Recommended)</option>
                  <option value="60">1 Hour</option>
                  <option value="240">4 Hours</option>
                </select>
              </div>
            </div>

            <div className="max-w-md pt-4 border-t border-slate-50">
              <label className="block text-[11px] font-bold text-slate-900 mb-1.5">Max Failed Login Attempts</label>
              <div className="relative">
                <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={maxFailedLogins}
                  onChange={(e) => setMaxFailedLogins(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="3">3 Attempts</option>
                  <option value="5">5 Attempts</option>
                  <option value="10">10 Attempts</option>
                </select>
              </div>
            </div>

            <div className="max-w-md pt-4 border-t border-slate-50">
              <label className="block text-[11px] font-bold text-slate-900 mb-1.5">Audit Log Retention</label>
              <p className="text-[9px] text-slate-500 mb-2">How long system activities (alerts, account suspensions) are stored before automatic archiving to cold storage.</p>
              <div className="relative">
                <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={auditRetention}
                  onChange={(e) => setAuditRetention(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="365">1 Year (Regulatory Standard)</option>
                  <option value="indefinite">Indefinite</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 3: USER INTERFACE                     */}
      {/* ========================================= */}
      {activeTab === "ui" && (
        <div className="space-y-5 animate-in fade-in duration-300 max-w-4xl">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <LayoutTemplate size={12} /> Visual Preferences
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-900 mb-3">Color Theme</label>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-slate-400 bg-slate-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <Sun size={20} className={theme === 'light' ? 'text-slate-900' : 'text-slate-400'} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-900' : 'text-slate-500'}`}>Light Mode</span>
                </button>
                <button 
                  onClick={() => setTheme("dark")}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-slate-400 bg-slate-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <Moon size={20} className={theme === 'dark' ? 'text-slate-900' : 'text-slate-400'} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-900' : 'text-slate-500'}`}>Dark Mode</span>
                </button>
                <button 
                  onClick={() => setTheme("system")}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-slate-400 bg-slate-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <Monitor size={20} className={theme === 'system' ? 'text-slate-900' : 'text-slate-400'} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'system' ? 'text-slate-900' : 'text-slate-500'}`}>Auto System</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <label className="block text-[11px] font-bold text-slate-900 mb-1.5">Sidebar Layout</label>
              <p className="text-[9px] text-slate-500 mb-3">Set the default behavior of the navigation sidebar. "Collapsed" is recommended to maximize workspace for data-heavy views like Case Reviews.</p>
              <div className="flex gap-3 max-w-sm">
                <button 
                  onClick={() => setSidebarLayout("expanded")}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${sidebarLayout === 'expanded' ? 'border-slate-400 bg-slate-50/50 text-slate-900' : 'border-slate-100 hover:border-slate-200 bg-white text-slate-500'}`}
                >
                  <SidebarIcon size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Expanded</span>
                </button>
                <button 
                  onClick={() => setSidebarLayout("collapsed")}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${sidebarLayout === 'collapsed' ? 'border-slate-400 bg-slate-50/50 text-slate-900' : 'border-slate-100 hover:border-slate-200 bg-white text-slate-500'}`}
                >
                  <LayoutTemplate size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Collapsed</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Settings;
