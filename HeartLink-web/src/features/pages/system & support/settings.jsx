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
  const [systemName, setSystemName] = useState("HeartLink Atelier");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState("15");
  
  // API Keys State
  const [googleMapsKey, setGoogleMapsKey] = useState("AIzaSyB••••••••••••••••••••••••");
  const [foodFactsKey, setFoodFactsKey] = useState("off_••••••••••••••••••••••••");

  // Security Settings State
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [auditRetention, setAuditRetention] = useState("90");

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
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            Administration
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Global <span className="text-[#1e4ed8]">Settings.</span>
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
            className="flex items-center gap-1.5 bg-[#1e4ed8] hover:bg-[#113296] text-white font-bold text-[11px] px-5 py-2 rounded-lg shadow-sm shadow-blue-900/20 transition-colors disabled:opacity-70"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="bg-white p-1 rounded-lg inline-flex flex-wrap shadow-sm border border-gray-100 mb-6 w-full sm:w-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "general" ? "bg-blue-50 text-[#1e4ed8] shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Settings2 size={14} /> General Config
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "security" ? "bg-blue-50 text-[#1e4ed8] shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <ShieldCheck size={14} /> Security & Access
        </button>
        <button
          onClick={() => setActiveTab("ui")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === "ui" ? "bg-blue-50 text-[#1e4ed8] shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
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
          <div className={`p-5 rounded-xl border transition-colors flex items-start justify-between gap-4 ${maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div>
              <h3 className={`text-sm font-bold flex items-center gap-1.5 mb-1 ${maintenanceMode ? 'text-red-700' : 'text-gray-900'}`}>
                <AlertTriangle size={16} className={maintenanceMode ? 'text-red-600' : 'text-gray-400'} />
                System Maintenance Mode
              </h3>
              <p className={`text-[10px] ${maintenanceMode ? 'text-red-600' : 'text-gray-500'} leading-relaxed max-w-xl`}>
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
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* System Branding & Operations */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <Settings2 size={12} /> System Identity
              </h4>
              <div>
                <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Portal Display Name</label>
                <input 
                  type="text" 
                  value={systemName} 
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Heartbeat Polling Interval</label>
                <p className="text-[9px] text-gray-500 mb-2">Defines how often the frontend pings the database to refresh the "System Status" and "Live Monitoring" feeds.</p>
                <div className="relative">
                  <RefreshCw size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select 
                    value={heartbeatInterval}
                    onChange={(e) => setHeartbeatInterval(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors appearance-none cursor-pointer"
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
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
              <h4 className="text-[10px] font-bold text-[#1e4ed8] uppercase tracking-widest border-b border-blue-100 pb-2 flex items-center gap-1.5">
                <Key size={12} /> External Integrations
              </h4>
              <div>
                <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Google Maps Platform Key</label>
                <p className="text-[9px] text-gray-500 mb-2">Required for Cardiologist Locator and boundaries.</p>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="password" 
                    value={googleMapsKey} 
                    onChange={(e) => setGoogleMapsKey(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Open Food Facts API Key</label>
                <p className="text-[9px] text-gray-500 mb-2">Required for barcode scanning and nutrition sync.</p>
                <div className="relative">
                  <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="password" 
                    value={foodFactsKey} 
                    onChange={(e) => setFoodFactsKey(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors" 
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
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-6">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <ShieldCheck size={12} /> Access Policies
            </h4>
            
            <div className="max-w-md">
              <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Admin Session Timeout</label>
              <p className="text-[9px] text-gray-500 mb-2">Defines how long an admin or expert session stays active in the browser before requiring re-authentication.</p>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select 
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes (Recommended)</option>
                  <option value="60">1 Hour</option>
                  <option value="240">4 Hours</option>
                </select>
              </div>
            </div>

            <div className="max-w-md pt-4 border-t border-gray-50">
              <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Audit Log Retention</label>
              <p className="text-[9px] text-gray-500 mb-2">How long system activities (alerts, account suspensions) are stored before automatic archiving to cold storage.</p>
              <div className="relative">
                <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select 
                  value={auditRetention}
                  onChange={(e) => setAuditRetention(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="365">1 Year</option>
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
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-6">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <LayoutTemplate size={12} /> Visual Preferences
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-gray-900 mb-3">Color Theme</label>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-[#1e4ed8] bg-blue-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <Sun size={20} className={theme === 'light' ? 'text-[#1e4ed8]' : 'text-gray-400'} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-[#1e4ed8]' : 'text-gray-500'}`}>Light Mode</span>
                </button>
                <button 
                  onClick={() => setTheme("dark")}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-[#1e4ed8] bg-blue-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <Moon size={20} className={theme === 'dark' ? 'text-[#1e4ed8]' : 'text-gray-400'} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-[#1e4ed8]' : 'text-gray-500'}`}>Dark Mode</span>
                </button>
                <button 
                  onClick={() => setTheme("system")}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-[#1e4ed8] bg-blue-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <Monitor size={20} className={theme === 'system' ? 'text-[#1e4ed8]' : 'text-gray-400'} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'system' ? 'text-[#1e4ed8]' : 'text-gray-500'}`}>Auto System</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50">
              <label className="block text-[11px] font-bold text-gray-900 mb-1.5">Sidebar Layout</label>
              <p className="text-[9px] text-gray-500 mb-3">Set the default behavior of the navigation sidebar. "Collapsed" is recommended to maximize workspace for data-heavy views like Case Reviews.</p>
              <div className="flex gap-3 max-w-sm">
                <button 
                  onClick={() => setSidebarLayout("expanded")}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${sidebarLayout === 'expanded' ? 'border-[#1e4ed8] bg-blue-50/30 text-[#1e4ed8]' : 'border-gray-100 hover:border-gray-200 bg-white text-gray-500'}`}
                >
                  <SidebarIcon size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Expanded</span>
                </button>
                <button 
                  onClick={() => setSidebarLayout("collapsed")}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${sidebarLayout === 'collapsed' ? 'border-[#1e4ed8] bg-blue-50/30 text-[#1e4ed8]' : 'border-gray-100 hover:border-gray-200 bg-white text-gray-500'}`}
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