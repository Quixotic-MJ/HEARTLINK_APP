import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Search,
  Zap,
  ChevronDown,
  Megaphone,
  UserPlus,
  LayoutDashboard,
  ClipboardList,
  Clock,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminNotificationDropdown from "./AdminNotificationDropdown";

export default function Header({ 
  setSidebarOpen, 
  title: propTitle,
}) {
  const location = useLocation();
  const pathSegment = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const defaultTitle = pathSegment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const title = propTitle || defaultTitle;

  const navigate = useNavigate();
  const { user, userId } = useAuth();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const qaMenuRef = useRef(null);

  const userRole = user?.role;

  // Live Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard accessibility & click outside for Quick Actions
  useEffect(() => {
    if (!quickActionsOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") setQuickActionsOpen(false);
    }
    function handleClickOutside(event) {
      if (qaMenuRef.current && !qaMenuRef.current.contains(event.target)) {
        setQuickActionsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [quickActionsOpen]);

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return;
      if (userRole === "medical_expert") {
        navigate(`/cases?search=${encodeURIComponent(trimmedQuery)}`);
      } else {
        navigate(`/users?search=${encodeURIComponent(trimmedQuery)}`);
      }
      setSearchQuery(""); 
    }
  };

  const searchPlaceholder = userRole === "medical_expert"
    ? "Search user profiles..."
    : "Search profiles or content...";

  return (
    <header
      className="sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center shrink-0 px-5 sm:px-6 bg-[#FFFFFF] border-b border-[#DCE3DF] h-[60px] select-none gap-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ═════════════════════════════════════════════════════════════════════════
          COLUMN 1: Mobile Toggle & Locked-Width Page Title Area
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-4">
        <button
          aria-label="Open sidebar"
          className="lg:hidden p-1.5 rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={16} />
        </button>

        {/* Fixed minimum width lane so title changes never push the search bar */}
        <div className="hidden md:flex items-center gap-5 min-w-[210px]">
          <h1 className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#292524] truncate">
            {title}
          </h1>
          <div className="w-px h-5 bg-[#DCE3DF] ml-auto" />
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          COLUMN 2: Steady, Non-Shifting Search Bar
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center">
        <div className="flex items-center gap-2 bg-[#FAFAF9] border border-[#DCE3DF] rounded-[6px] px-2.5 h-[32px] w-full max-w-[320px] focus-within:bg-[#FFFFFF] focus-within:border-[#E8532E] focus-within:ring-2 focus-within:ring-[#E8532E]/10 transition-all">
          <Search size={13} className="text-[#78716C] shrink-0" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-transparent border-none outline-none text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] h-full font-medium"
          />
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          COLUMN 3: Live Clock, Quick Actions & Notifications
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 justify-end">
        
        {/* Live Clock Widget */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11.5px] font-medium text-[#78716C] bg-[#FAFAF9] border border-[#DCE3DF] px-2.5 h-[32px] rounded-[6px]">
          <Clock size={13} className="text-[#E8532E]" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

        {/* Quick Actions Dropdown */}
        <div className="relative hidden md:block" ref={qaMenuRef}>
          <button
            onClick={() => setQuickActionsOpen(prev => !prev)}
            aria-expanded={quickActionsOpen}
            aria-label="Quick actions"
            className="flex items-center gap-1.5 bg-[#E8532E] hover:bg-[#C13E20] text-white rounded-[6px] px-3 h-[32px] text-[12px] font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Zap size={13} strokeWidth={2.5} />
            <span>Actions</span>
            <ChevronDown
              size={11}
              strokeWidth={2.5}
              className={`transition-transform duration-150 ${quickActionsOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>

          {quickActionsOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[210px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-[10px] shadow-lg p-1.5 z-50">
              {userRole === "admin" || userRole === "super_admin" ? (
                <>
                  <div className="text-[10.5px] font-semibold text-[#94A3B8] px-2.5 pt-2 pb-1 uppercase tracking-wider">
                    System actions
                  </div>
                  <button
                    onClick={() => { navigate('/broadcasts'); setQuickActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[12.5px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer"
                  >
                    <Megaphone size={14} className="text-[#2E9AE8] shrink-0" />
                    <span>Send announcement</span>
                  </button>
                  {userRole === "super_admin" && (
                    <button
                      onClick={() => { navigate('/users'); setQuickActionsOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[12.5px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer"
                    >
                      <UserPlus size={14} className="text-[#2E9AE8] shrink-0" />
                      <span>Provision staff account</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="text-[10.5px] font-semibold text-[#94A3B8] px-2.5 pt-2 pb-1 uppercase tracking-wider">
                    Evaluation actions
                  </div>
                  <button
                    onClick={() => { navigate('/dashboard'); setQuickActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[12.5px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer"
                  >
                    <LayoutDashboard size={14} className="text-[#2E9AE8] shrink-0" />
                    <span>View Dashboard</span>
                  </button>
                  <button
                    onClick={() => { navigate('/cases'); setQuickActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[12.5px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer"
                  >
                    <ClipboardList size={14} className="text-[#2E9AE8] shrink-0" />
                    <span>Review cases</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        {(userRole === "admin" || userRole === "super_admin") && (
          <AdminNotificationDropdown userId={userId || user?.id} />
        )}
      </div>
    </header>
  );
}