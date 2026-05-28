import React, { useState } from "react";
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  // State to control desktop collapse
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-slate-50 border-r border-gray-100 flex flex-col justify-between flex-shrink-0
        transition-all duration-300 ease-in-out relative
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "w-20" : "w-64"}
      `}
      >
        {/* Desktop Collapse/Expand Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center absolute -right-3.5 top-9 w-7 h-7 bg-white border border-gray-200 text-gray-400 hover:text-[#1e4ed8] hover:border-blue-200 hover:shadow-md rounded-full shadow-sm transition-all z-50 outline-none focus:ring-2 focus:ring-blue-100"
        >
          {isCollapsed ? (
            <ChevronRight size={14} strokeWidth={3} className="ml-0.5" />
          ) : (
            <ChevronLeft size={14} strokeWidth={3} className="mr-0.5" />
          )}
        </button>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-50 transition-all duration-500"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-50 transition-all duration-500"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          
          {/* Enhanced Logo Area */}
          <div className="flex items-center p-6 mb-2">
            <div className="flex items-center">
              <div className="bg-[#1e4ed8] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0 transition-all duration-300">
                <HeartPulse size={20} strokeWidth={2.5} />
              </div>
              
              {/* Smoothly collapsing text container */}
              <div
                className={`flex flex-col cursor-pointer overflow-hidden transition-all duration-300 whitespace-nowrap ${
                  isCollapsed ? "w-0 opacity-0 ml-0" : "w-32 opacity-100 ml-3"
                }`}
              >
                <span className="text-gray-900 text-xl font-bold tracking-tight leading-none">
                  Heart<span className="text-[#1e4ed8]">Link</span>
                </span>
                <span className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-1">
                  Atelier
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              className="lg:hidden ml-auto text-gray-400 hover:text-gray-900 bg-white p-1.5 rounded-md border border-gray-100 shadow-sm shrink-0 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6">
            
            {/* Section 1: Overview */}
            <div className={`mt-2 mb-1 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "px-2"}`}>
              {isCollapsed ? (
                <div className="h-1 w-1 bg-gray-300 rounded-full my-2 transition-all"></div>
              ) : (
                <p className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">
                  Overview
                </p>
              )}
            </div>

            <a
              href="#"
              className={`flex items-center text-[#1e4ed8] bg-white border border-blue-100 shadow-sm rounded-xl font-semibold transition-all group shrink-0 ${
                isCollapsed ? "w-11 h-11 justify-center mx-auto" : "w-full px-3 py-2.5"
              }`}
              title={isCollapsed ? "Dashboard" : ""}
            >
              <LayoutDashboard size={18} strokeWidth={2.5} className="shrink-0" />
              <span
                className={`overflow-hidden transition-all duration-300 whitespace-nowrap text-sm ${
                  isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-2.5"
                }`}
              >
                Dashboard
              </span>
            </a>

            {/* Section 2: Management */}
            <div className={`mt-6 mb-1 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "px-2"}`}>
              {isCollapsed ? (
                <div className="h-1 w-1 bg-gray-300 rounded-full my-2 transition-all"></div>
              ) : (
                <p className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">
                  Management
                </p>
              )}
            </div>

            <a
              href="#"
              className={`flex items-center text-gray-500 hover:bg-white hover:border-gray-100 border border-transparent hover:shadow-sm hover:text-gray-900 rounded-xl font-medium transition-all group shrink-0 ${
                isCollapsed ? "w-11 h-11 justify-center mx-auto" : "w-full px-3 py-2.5"
              }`}
              title={isCollapsed ? "User Management" : ""}
            >
              <Users
                size={18}
                className="group-hover:text-[#1e4ed8] transition-colors shrink-0"
              />
              <span
                className={`overflow-hidden transition-all duration-300 whitespace-nowrap text-sm ${
                  isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-2.5"
                }`}
              >
                User Management
              </span>
            </a>

            <a
              href="#"
              className={`flex items-center text-gray-500 hover:bg-white hover:border-gray-100 border border-transparent hover:shadow-sm hover:text-gray-900 rounded-xl font-medium transition-all group shrink-0 ${
                isCollapsed ? "w-11 h-11 justify-center mx-auto" : "w-full px-3 py-2.5"
              }`}
              title={isCollapsed ? "Content Management" : ""}
            >
              <FileText
                size={18}
                className="group-hover:text-[#1e4ed8] transition-colors shrink-0"
              />
              <span
                className={`overflow-hidden transition-all duration-300 whitespace-nowrap text-sm ${
                  isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-2.5"
                }`}
              >
                Content Management
              </span>
            </a>

            {/* Section 3: System */}
            <div className={`mt-6 mb-1 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "px-2"}`}>
              {isCollapsed ? (
                <div className="h-1 w-1 bg-gray-300 rounded-full my-2 transition-all"></div>
              ) : (
                <p className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">
                  System
                </p>
              )}
            </div>

            <a
              href="#"
              className={`flex items-center text-gray-500 hover:bg-white hover:border-gray-100 border border-transparent hover:shadow-sm hover:text-gray-900 rounded-xl font-medium transition-all group shrink-0 ${
                isCollapsed ? "w-11 h-11 justify-center mx-auto" : "w-full px-3 py-2.5"
              }`}
              title={isCollapsed ? "Settings" : ""}
            >
              <Settings
                size={18}
                className="group-hover:text-[#1e4ed8] transition-colors shrink-0"
              />
              <span
                className={`overflow-hidden transition-all duration-300 whitespace-nowrap text-sm ${
                  isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-2.5"
                }`}
              >
                Settings
              </span>
            </a>
            
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;