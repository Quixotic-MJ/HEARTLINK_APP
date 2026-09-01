import React, { useState, useEffect } from "react";
import {
  Menu,
  Search,
  Activity,
  Zap,
  ChevronDown,
  LogOut,
  BellRing,
  UserPlus,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminNotificationDropdown from "./AdminNotificationDropdown";

// ─── Quick action item ────────────────────────────────────────────────────────

function ActionItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors text-xs text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
    >
      <Icon size={14} className="text-[#E55F37] shrink-0" strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = ({ 
  setSidebarOpen, 
  title: propTitle,
  onLogoutClick,
}) => {
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

  const userRole = user?.role;

  // Keyboard accessibility: Escape to close Quick Actions dropdown
  useEffect(() => {
    if (!quickActionsOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setQuickActionsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    ? "Search cases by name or ID..."
    : "Search users by name or ID...";

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between flex-shrink-0 px-5 sm:px-6 bg-[#161616] border-b border-white/10 h-16"
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-4">
        {/* Mobile menu */}
        <button
          aria-label="Open sidebar"
          className="lg:hidden p-2 rounded-xl transition-colors bg-[#1A1A1A] border border-white/10 text-slate-300 hover:text-white"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={17} />
        </button>

        {/* Page title */}
        <h1
          className="hidden lg:block text-[15px] font-semibold tracking-tight text-white"
        >
          {title}
        </h1>

        {/* Search */}
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 h-9 bg-[#1A1A1A] border border-white/10 focus-within:border-[#E55F37] transition-all w-52 sm:w-64"
        >
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            type="text"
            aria-label="Search"
            placeholder={searchPlaceholder}
            className="bg-transparent border-none outline-none w-full text-xs sm:text-sm text-white placeholder:text-slate-500 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-2.5">

        {/* Quick actions */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            aria-label="Quick actions"
            aria-expanded={quickActionsOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 rounded-xl px-3.5 h-9 text-xs font-semibold bg-[#E55F37] hover:bg-[#D4542E] text-white transition-all cursor-pointer shadow-sm shadow-[#E55F37]/20"
          >
            <Zap size={13} strokeWidth={2.5} />
            <span>Quick actions</span>
            <ChevronDown
              size={12}
              strokeWidth={2.5}
              className={`transition-transform duration-200 ${quickActionsOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>

          {quickActionsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setQuickActionsOpen(false)} />
              <div
                className="absolute right-0 mt-2 z-50 py-1.5 rounded-2xl overflow-hidden w-52 bg-[#1A1A1A] border border-white/10 shadow-2xl"
              >
                {userRole === "admin" || userRole === "super_admin" ? (
                  <>
                    <p
                      className="px-4 pt-1.5 pb-2 text-[9px] tracking-[0.18em] uppercase font-bold text-[#89899C] border-b border-white/10"
                    >
                      SYSTEM ACTIONS
                    </p>
                    <ActionItem icon={BellRing} label="Send Announcement" onClick={() => { navigate('/broadcasts'); setQuickActionsOpen(false); }} />
                    {userRole === "super_admin" && (
                      <ActionItem icon={UserPlus} label="Provision staff account" onClick={() => { navigate('/users'); setQuickActionsOpen(false); }} />
                    )}
                  </>
                ) : (
                  <>
                    <p
                      className="px-4 pt-1.5 pb-2 text-[9px] tracking-[0.18em] uppercase font-bold text-[#89899C] border-b border-white/10"
                    >
                      EVALUATION ACTIONS
                    </p>
                    <ActionItem icon={LayoutDashboard} label="View Dashboard" onClick={() => { navigate('/dashboard'); setQuickActionsOpen(false); }} />
                    <ActionItem icon={ClipboardList} label="Review Cases" onClick={() => { navigate('/cases'); setQuickActionsOpen(false); }} />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* System status */}
        <div
          className="hidden lg:flex items-center gap-3 rounded-xl px-3 h-9 bg-[#1A1A1A] border border-white/10 select-none"
        >
          <div>
            <p className="text-[11px] font-semibold leading-tight text-white">
              System status
            </p>
            <p className="text-[8px] tracking-widest uppercase leading-tight mt-0.5 text-[#5EC235] font-bold">
              Operational
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5EC235] animate-pulse" />
            <Activity size={13} strokeWidth={2} className="text-[#5EC235]" />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-white/10" />

        {/* Notifications */}
        {(userRole === "admin" || userRole === "super_admin") && (
          <AdminNotificationDropdown userId={userId || user?.id} />
        )}

        {/* Sign out */}
        <button
          onClick={onLogoutClick || (() => {
            logout();
            navigate("/");
          })}
          aria-label="Sign out"
          className="flex items-center justify-center rounded-xl w-9 h-9 bg-[#1A1A1A] border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer ml-1"
          title="Sign out"
        >
          <LogOut size={15} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

export default Header;