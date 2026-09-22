import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Search,
  Zap,
  ChevronDown,
  LogOut,
  Bell,
  Megaphone,
  UserPlus,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminNotificationDropdown from "./AdminNotificationDropdown";

export default function Header({ 
  setSidebarOpen, 
  title: propTitle,
  onLogoutClick,
}) {
  const location = useLocation();
  const pathSegment = location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const defaultTitle = pathSegment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const title = propTitle || defaultTitle;
  
  const navigate = useNavigate();
  const { user, userId, logout } = useAuth();

  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const qaMenuRef = useRef(null);

  const userRole = user?.role;

  // Keyboard accessibility & click outside for Quick Actions
  useEffect(() => {
    if (!quickActionsOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setQuickActionsOpen(false);
      }
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
    ? "Search cases by name or ID…"
    : "Search users by name or ID…";

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      logout();
      navigate("/");
    }
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between shrink-0 px-5 sm:px-6 bg-[#FFFFFF] border-b border-[#E2E8F0] h-[60px] select-none"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-4">
        {/* Mobile sidebar toggle button */}
        <button
          aria-label="Open sidebar"
          className="lg:hidden p-1.5 rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={16} />
        </button>

        {/* Page Title */}
        <span className="hidden sm:block text-[15px] font-semibold text-[#0F172A]">
          {title}
        </span>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] px-3 h-[36px] w-48 sm:w-[230px] focus-within:border-[#0F172A] transition-colors">
          <Search size={14} className="text-[#94A3B8] shrink-0" />
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

      {/* ── Right ── */}
      <div className="flex items-center gap-2.5">
        
        {/* Quick Actions Dropdown */}
        <div className="relative hidden md:block" ref={qaMenuRef}>
          <button
            onClick={() => setQuickActionsOpen(prev => !prev)}
            aria-expanded={quickActionsOpen}
            aria-label="Quick actions"
            className="flex items-center gap-1.5 bg-[#0F172A] hover:bg-[#0d1622] text-white rounded-[8px] px-3.5 h-[36px] text-[12.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Zap size={14} strokeWidth={2.5} />
            <span>Quick actions</span>
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

        {/* Operational Status Chip */}
        <div className="hidden lg:flex items-center gap-2.5 border border-[#E2E8F0] rounded-[8px] px-3 h-[36px] bg-[#FFFFFF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1B6E63] shrink-0" />
          <div className="text-left">
            <div className="text-[11.5px] font-semibold text-[#0F172A] leading-tight">System status</div>
            <div className="text-[9.5px] font-bold text-[#1B6E63] tracking-wide uppercase">Operational</div>
          </div>
        </div>

        <div className="hidden sm:block w-px h-[22px] bg-[#E2E8F0]" />

        {/* Notifications (Wraps AdminNotificationDropdown) */}
        {(userRole === "admin" || userRole === "super_admin") && (
          <AdminNotificationDropdown userId={userId || user?.id} />
        )}

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
          className="w-[36px] h-[36px] rounded-[8px] border border-[#E2E8F0] bg-[#FFFFFF] hover:text-[#A93226] hover:border-[#F0C4B8] hover:bg-[#F7E4E1] flex items-center justify-center text-[#64748B] transition-colors cursor-pointer"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}