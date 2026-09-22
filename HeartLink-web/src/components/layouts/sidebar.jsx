import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PieChart,
  Utensils,
  Dumbbell,
  ClipboardList,
  History,
  Activity,
  Users,
  MessageSquare,
  Megaphone,
  Settings,
  Bell,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

// ─── Brand Logo Emblem ────────────────────────────────────────────────────────
function HeartLogoIcon({ size = 24 }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sidebarHeartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6EC1F5" />
          <stop offset="100%" stopColor="#2E9AE8" />
        </linearGradient>
      </defs>
      <path
        d="M256,410 C256,410 108,308 108,202 C108,148 150,106 204,106 C230,106 254,120 256,138 C258,120 282,106 308,106 C362,106 404,148 404,202 C404,308 256,410 256,410 Z"
        fill="url(#sidebarHeartGrad)"
      />
      <path
        d="M150,246 L196,246 L216,196 L246,296 L276,216 L302,246 L362,246"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }) {
  if (collapsed) return null;
  return (
    <div className="text-[11px] text-[#94A3B8] font-semibold px-2.5 pt-3.5 pb-1.5 select-none">
      {label}
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────
function NavItem({ path, icon: Icon, label, collapsed, badge = null, activeOverride = false }) {
  const location = useLocation();
  const active = activeOverride || location.pathname === path;

  return (
    <Link
      to={path}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] mb-0.5 text-[13px] font-medium transition-colors select-none ${
        active
          ? "bg-[#2E9AE8] text-white font-semibold shadow-2xs"
          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
      }`}
      style={{
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? "9px 0" : "8px 10px",
      }}
    >
      <Icon
        size={15}
        className={`shrink-0 transition-transform ${
          active ? "text-white" : "text-[#94A3B8] group-hover:text-[#0F172A]"
        }`}
        strokeWidth={active ? 2.5 : 2}
      />

      {!collapsed && (
        <span className="leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">
          {label}
        </span>
      )}
      
      {!collapsed && badge && (
        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[#EAF5FC] text-[#2E9AE8] text-[10px] font-bold">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────────────────
const Sidebar = ({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed, onLogoutClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const role = user?.role || "admin";
  const userName = (user?.first_name || user?.last_name) 
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() 
    : (user?.email || "Staff User");
  const userInitials = userName ? userName.substring(0, 2).toUpperCase() : "HL";

  const getRoleLabel = (r) => {
    if (r === "super_admin") return "Super admin";
    if (r === "admin") return "System admin";
    if (r === "medical_expert") return "Medical expert";
    return "Staff user";
  };

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      logout();
      navigate("/");
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col shrink-0 bg-[#FFFFFF] border-r border-[#E2E8F0] transition-all duration-200 select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: collapsed ? 64 : 240,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Mobile close button */}
        <button
          className="lg:hidden absolute right-3 top-3.5 p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>

        {/* Brand Header (Acts as collapse toggle) */}
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          className={`flex items-center gap-2.5 p-[18px_18px_14px] w-full text-left bg-transparent border-none cursor-pointer group ${
            collapsed ? "justify-center !px-0" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <HeartLogoIcon size={24} />
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <div 
                className="text-[16px] font-medium leading-[1.1] text-[#0F172A]"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                HeartLink
              </div>
              <div className="text-[10px] font-semibold text-[#1C7AC8] mt-0.5">
                Admin portal
              </div>
            </div>
          )}
        </button>

        <div className="mx-4 mb-2 border-t border-[#E2E8F0]" />

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <SectionLabel label="Overview" collapsed={collapsed} />
          <NavItem path="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
          
          {(role === "admin" || role === "super_admin") && (
            <NavItem path="/analytics" icon={PieChart} label="Analytics" collapsed={collapsed} />
          )}

          <NavItem path="/notifications" icon={Bell} label="Notifications" collapsed={collapsed} />

          {(role === "admin" || role === "super_admin") && (
            <>
              <SectionLabel label="Content" collapsed={collapsed} />
              <NavItem path="/foods" icon={Utensils} label="Food & recipe library" collapsed={collapsed} />
              <NavItem path="/exercises" icon={Dumbbell} label="Exercise library" collapsed={collapsed} />
            </>
          )}

          <SectionLabel label="HSS evaluation" collapsed={collapsed} />
          <NavItem path="/cases" icon={ClipboardList} label="Case review" collapsed={collapsed} />
          <NavItem path="/calibration" icon={History} label="Calibration history" collapsed={collapsed} />

          {(role === "admin" || role === "super_admin") && (
            <>
              <SectionLabel label="Users & feedback" collapsed={collapsed} />
              <NavItem path="/users" icon={Users} label="Users" collapsed={collapsed} />
              <NavItem path="/feedbacks" icon={MessageSquare} label="Feedback" collapsed={collapsed} />

              <SectionLabel label="System" collapsed={collapsed} />
              <NavItem path="/activity-log" icon={Activity} label="Activity log" collapsed={collapsed} />
              <NavItem path="/broadcasts" icon={Megaphone} label="Announcements" collapsed={collapsed} />
              <NavItem path="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
            </>
          )}
        </nav>

        {/* Bottom User Footer Strip */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#FFFFFF]">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center bg-[#EAF5FC] text-[#1C7AC8] text-[11px] font-bold"
                title={`${userName} (${getRoleLabel(role)})`}
              >
                {userInitials}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-[#94A3B8] hover:text-[#A93226] transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-2 rounded-[9px] border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-[#EAF5FC] text-[#1C7AC8] text-[11px] font-bold">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[#0F172A] truncate leading-tight">
                  {userName}
                </div>
                <div className="text-[10px] font-medium text-[#64748B] truncate mt-0.5">
                  {getRoleLabel(role)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-[#94A3B8] hover:text-[#A93226] transition-colors cursor-pointer shrink-0"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;