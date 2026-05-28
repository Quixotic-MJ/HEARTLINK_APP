import React, { useState } from "react";
import {
  Menu,
  Search,
  Plus,
  Activity,
  Bell,
  ShieldCheck,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { Link } from "react-router-dom";

const Header = ({ setSidebarOpen }) => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3.5 flex items-center justify-between flex-shrink-0 z-20 sticky top-0">
      <div className="flex items-center gap-3 w-full lg:w-auto">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-gray-500 hover:text-gray-900 p-1.5 bg-gray-50 rounded-lg border border-gray-100"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={18} />
        </button>

        {/* Search Bar */}
        <div className="flex items-center bg-[#f8fafc] rounded-lg px-3 py-2 w-full max-w-xs xl:max-w-sm border border-gray-100 focus-within:ring-2 focus-within:ring-[#1e4ed8]/20 focus-within:border-[#1e4ed8] transition-all shadow-sm">
          <Search size={16} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search patients, logs..."
            className="bg-transparent border-none outline-none text-xs w-full text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="hidden sm:flex items-center gap-4">
        {/* New Report Action */}
        <button className="bg-[#1e4ed8] hover:bg-[#113296] text-white font-semibold py-2 px-3.5 rounded-lg transition-all shadow-sm shadow-blue-900/20 flex items-center justify-center gap-1.5 text-xs">
          <Plus size={16} strokeWidth={2.5} />
          <span className="hidden md:inline">New Report</span>
        </button>

        {/* System Status */}
        <div className="hidden xl:flex items-center justify-between border border-gray-100 bg-[#f8fafc] px-3 py-1.5 rounded-lg shadow-sm min-w-[130px]">
          <div>
            <span className="text-gray-900 font-bold text-[11px] block leading-tight">
              System Status
            </span>
            <span className="text-gray-500 text-[8px] font-medium tracking-widest uppercase">
              Live Monitoring
            </span>
          </div>
          <Activity className="text-[#1e4ed8]" size={14} strokeWidth={2.5} />
        </div>

        <div className="h-6 w-px bg-gray-100 hidden md:block"></div>

        {/* Notifications */}
        <button className="text-gray-400 hover:text-[#1e4ed8] relative transition-colors bg-[#f8fafc] p-2 rounded-lg border border-gray-100 shadow-sm">
          <Bell size={16} />
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
        </button>

        <div className="h-6 w-px bg-gray-100"></div>

        {/* Profile Dropdown Component */}
        <div className="relative">
          <div
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="relative">
              <img
                src="https://ui-avatars.com/api/?name=Admin+User&background=1e4ed8&color=fff&rounded=true&bold=true"
                alt="Profile"
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="hidden md:block text-left">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                  Admin User
                </p>
                <ShieldCheck size={12} className="text-[#1e4ed8]" />
              </div>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-medium mt-1">
                Chief Admin
              </p>
            </div>
            <ChevronDown
              size={14}
              className={`text-gray-400 group-hover:text-gray-900 hidden md:block transition-transform duration-200 ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {/* Dropdown Menu */}
          {profileOpen && (
            <>
              {/* Invisible backdrop to close dropdown when clicking outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              ></div>

              <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 transform opacity-100 scale-100 transition-all origin-top-right">
                <a
                  href="#"
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User size={14} className="text-gray-400" /> My Profile
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={14} className="text-gray-400" /> Account
                  Settings
                </a>

                <div className="h-px bg-gray-100 my-1.5"></div>

                <Link to="/">
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left">
                    <LogOut size={14} /> Sign Out
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
