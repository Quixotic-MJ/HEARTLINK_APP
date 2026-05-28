import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom"; // Added React Router imports
import {
  HeartPulse,
  LayoutDashboard,
  PieChart,
  Users,
  Utensils,
  Dumbbell,
  ClipboardList,
  History,
  Activity,
  UserCog,
  MessageSquare,
  Megaphone,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
} from "lucide-react";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Use React Router's location to determine the active tab dynamically
  const location = useLocation();
  const activePath = location.pathname;

  // Reusable NavItem component using React Router's <Link>
  const NavItem = ({ path, icon: Icon, label, isCollapsed }) => {
    // Check if the current URL matches the path
    const isActive = activePath === path;

    return (
      <Link
        to={path}
        className={`flex items-center rounded-lg font-medium transition-all group shrink-0 ${
          isCollapsed ? "w-9 h-9 justify-center mx-auto" : "w-full px-2.5 py-2"
        } ${
          isActive
            ? "bg-white text-[#1e4ed8] border border-blue-100 shadow-sm"
            : "text-gray-500 hover:bg-white hover:border-gray-100 border border-transparent hover:shadow-sm hover:text-gray-900"
        }`}
        title={isCollapsed ? label : ""}
      >
        <Icon
          size={16}
          strokeWidth={isActive ? 2.5 : 2}
          className={`shrink-0 transition-colors ${
            isActive ? "text-[#1e4ed8]" : "group-hover:text-[#1e4ed8]"
          }`}
        />
        <span
          className={`overflow-hidden transition-all duration-300 whitespace-nowrap text-xs ${
            isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-2.5"
          } ${isActive ? "font-semibold" : ""}`}
        >
          {label}
        </span>
      </Link>
    );
  };

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
        ${isCollapsed ? "w-16" : "w-64"}
      `}
      >
        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center absolute -right-3 top-7 w-6 h-6 bg-white border border-gray-200 text-gray-400 hover:text-[#1e4ed8] hover:border-blue-200 hover:shadow-md rounded-full shadow-sm transition-all z-50 outline-none focus:ring-2 focus:ring-blue-100"
        >
          <ChevronLeft
            size={12}
            strokeWidth={3}
            className={`transition-transform duration-500 ease-in-out ${isCollapsed ? "rotate-180" : "rotate-0"}`}
          />
        </button>

        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 transition-all duration-500"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50 transition-all duration-500"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {/* Logo Area */}
          <div className="flex items-center p-5 mb-1">
            <div className="flex items-center">
              <div className="bg-[#1e4ed8] text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0 transition-all duration-300">
                <HeartPulse size={16} strokeWidth={2.5} />
              </div>
              <div
                className={`flex flex-col cursor-pointer overflow-hidden transition-all duration-300 whitespace-nowrap ${
                  isCollapsed ? "w-0 opacity-0 ml-0" : "w-32 opacity-100 ml-2.5"
                }`}
              >
                <span className="text-gray-900 text-lg font-bold tracking-tight leading-none">
                  Heart<span className="text-[#1e4ed8]">Link</span>
                </span>
                <span className="text-[7px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-1">
                  Atelier
                </span>
              </div>
            </div>
            <button
              className="lg:hidden ml-auto text-gray-400 hover:text-gray-900 bg-white p-1 rounded-md border border-gray-100 shadow-sm shrink-0 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden px-3.5 pb-6 custom-scrollbar">
            <div
              className={`mt-2 mb-1 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "px-2"}`}
            >
              {isCollapsed ? (
                <div className="h-px w-4 bg-gray-300 rounded-full my-1.5 transition-all"></div>
              ) : (
                <p className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">
                  Overview
                </p>
              )}
            </div>

            {/* These paths must exactly match your App.jsx router setup */}
            <NavItem
              path="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              isCollapsed={isCollapsed}
            />
            <NavItem
              path="/analytics"
              icon={PieChart}
              label="Analytics"
              isCollapsed={isCollapsed}
            />

            <div
              className={`mt-4 mb-1 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "px-2"}`}
            >
              {isCollapsed ? (
                <div className="h-px w-4 bg-gray-300 rounded-full my-1.5 transition-all"></div>
              ) : (
                <p className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">
                  Management
                </p>
              )}
            </div>

            <NavItem
              path="/specialists"
              icon={Stethoscope}
              label="Specialist Directory"
              isCollapsed={isCollapsed}
            />
            <NavItem
              path="/recipes"
              icon={Utensils}
              label="Recipe Management"
              isCollapsed={isCollapsed}
            />
            <NavItem
              path="/exercises"
              icon={Dumbbell}
              label="Exercise Management"
              isCollapsed={isCollapsed}
            />

            <div
              className={`mt-4 mb-1 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "px-2"}`}
            >
              {isCollapsed ? (
                <div className="h-px w-4 bg-gray-300 rounded-full my-1.5 transition-all"></div>
              ) : (
                <p className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">
                  Clinical Portal
                </p>
              )}
            </div>

            <NavItem
              path="/cases"
              icon={ClipboardList}
              label="Case Review Queue"
              isCollapsed={isCollapsed}
            />
            <NavItem
              path="/calibration"
              icon={History}
              label="Calibration History"
              isCollapsed={isCollapsed}
            />
            <NavItem
              path="/alerts"
              icon={Activity}
              label="Alert Monitoring"
              isCollapsed={isCollapsed}
            />

            <div
              className={`mt-4 mb-1 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "px-2"}`}
            >
              {isCollapsed ? (
                <div className="h-px w-4 bg-gray-300 rounded-full my-1.5 transition-all"></div>
              ) : (
                <p className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase whitespace-nowrap">
                  System & Support
                </p>
              )}
            </div>

            <NavItem
              path="/users"
              icon={UserCog}
              label="User Management"
              isCollapsed={isCollapsed}
            />
            <NavItem
              path="/feedbacks"
              icon={MessageSquare}
              label="Feedback & Reports"
              isCollapsed={isCollapsed}
            />
            <NavItem
              path="/broadcasts"
              icon={Megaphone}
              label="System Broadcasts"
              isCollapsed={isCollapsed}
            />
            <NavItem
              path="/settings"
              icon={Settings}
              label="Settings"
              isCollapsed={isCollapsed}
            />
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
