import React, { useState } from "react";
import {
  Menu,
  Search,
  Activity,
  Bell,
  Zap,
  Utensils,
  AlertTriangle,
  FileText,
  Stethoscope,
  ChevronRight,
  ChevronDown,
  LogOut
} from "lucide-react";
import { Link } from "react-router-dom";

const Header = ({ setSidebarOpen }) => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  
  // Simulated state for dynamic UI elements
  const [unreadAlerts] = useState(12);
  const [userRole] = useState("sysadmin"); // Toggle between "sysadmin" and "medical" to see different Quick Actions
  
  // Simulated system status (Clicking the status widget will cycle through these for demonstration)
  const [statusState, setStatusState] = useState("healthy");

  const toggleStatus = () => {
    const states = ["healthy", "warning", "critical"];
    const nextIndex = (states.indexOf(statusState) + 1) % states.length;
    setStatusState(states[nextIndex]);
  };

  const statusConfig = {
    healthy: {
      bg: "bg-[#f8fafc]",
      border: "border-gray-100",
      iconColor: "text-[#1e4ed8]",
      titleColor: "text-gray-900",
      subText: "Live Monitoring",
      subTextColor: "text-gray-500",
      icon: Activity
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      iconColor: "text-yellow-600",
      titleColor: "text-yellow-900",
      subText: "Sync Delayed",
      subTextColor: "text-yellow-700",
      icon: AlertTriangle
    },
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      iconColor: "text-red-600",
      titleColor: "text-red-900",
      subText: "Action Required",
      subTextColor: "text-red-600",
      icon: AlertTriangle
    }
  };

  const currentStatus = statusConfig[statusState];
  const StatusIcon = currentStatus.icon;

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3.5 flex items-center justify-between flex-shrink-0 z-20 sticky top-0">
      
      <div className="flex items-center gap-4 w-full lg:w-auto">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-gray-500 hover:text-gray-900 p-1.5 bg-gray-50 rounded-lg border border-gray-100"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb Navigation (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center text-xs font-medium text-gray-500 select-none shrink-0 pr-2">
          <span className="hover:text-gray-900 cursor-pointer transition-colors">Dashboard</span>
          </div>

        {/* Search Bar */}
        <div className="flex items-center bg-[#f8fafc] rounded-lg px-3 py-2 w-full max-w-xs border border-gray-100 focus-within:ring-2 focus-within:ring-[#1e4ed8]/20 focus-within:border-[#1e4ed8] transition-all shadow-sm">
          <Search size={14} className="text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search patients, logs..."
            className="bg-transparent border-none outline-none text-xs w-full text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="hidden sm:flex items-center gap-4">
        
        {/* Contextual Quick Actions Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="bg-[#1e4ed8] hover:bg-[#113296] text-white font-semibold py-2 px-3.5 rounded-lg transition-all shadow-sm shadow-blue-900/20 flex items-center justify-center gap-1.5 text-xs"
          >
            <Zap size={14} strokeWidth={2.5} />
            <span className="hidden md:inline">Quick Actions</span>
            <ChevronDown size={12} strokeWidth={2.5} className={`transition-transform duration-200 ml-0.5 ${quickActionsOpen ? "rotate-180" : ""}`} />
          </button>

          {quickActionsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setQuickActionsOpen(false)}></div>
              <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 transform opacity-100 scale-100 transition-all origin-top-right">
                
                <div className="px-3 py-1.5 mb-1 border-b border-gray-50">
                  <p className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">Contextual Actions</p>
                </div>

                {userRole === "sysadmin" ? (
                  <>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left">
                      <Utensils size={14} className="text-[#1e4ed8]" /> Add Recipe
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left">
                      <Bell size={14} className="text-[#1e4ed8]" /> Send Broadcast Alert
                    </button>
                  </>
                ) : (
                  <>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left">
                      <FileText size={14} className="text-[#1e4ed8]" /> New Analysis
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left">
                      <Stethoscope size={14} className="text-[#1e4ed8]" /> Evaluate Case
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Dynamic System Status */}
        <div 
          onClick={toggleStatus}
          className={`hidden xl:flex items-center justify-between border ${currentStatus.border} ${currentStatus.bg} px-3 py-1.5 rounded-lg shadow-sm min-w-[130px] cursor-pointer transition-colors duration-300`}
        >
          <div>
            <span className={`${currentStatus.titleColor} font-bold text-[11px] block leading-tight`}>
              System Status
            </span>
            <span className={`${currentStatus.subTextColor} text-[8px] font-bold tracking-widest uppercase`}>
              {currentStatus.subText}
            </span>
          </div>
          <StatusIcon className={currentStatus.iconColor} size={14} strokeWidth={2.5} />
        </div>

        <div className="h-6 w-px bg-gray-100 hidden md:block"></div>

        {/* Improved Notifications with Numeric Badge */}
        <button className="text-gray-400 hover:text-[#1e4ed8] relative transition-colors bg-[#f8fafc] p-2 rounded-lg border border-gray-100 shadow-sm">
          <Bell size={16} />
          {unreadAlerts > 0 && (
            <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center px-1 shadow-sm">
              <span className="text-[8px] font-bold text-white leading-none">
                {unreadAlerts > 99 ? '99+' : unreadAlerts}
              </span>
            </div>
          )}
        </button>

        <div className="h-6 w-px bg-gray-100 hidden md:block"></div>

        {/* Standalone Logout Button */}
        <Link to="/">
          <button 
            className="text-gray-400 hover:text-red-600 transition-colors bg-[#f8fafc] p-2 rounded-lg border border-gray-100 shadow-sm group"
            title="Sign Out"
          >
            <LogOut size={16} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </Link>

      </div>
    </header>
  );
};

export default Header;