import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PieChart,
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
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

// ─── Brand logo ───────────────────────────────────────────────────────────────

function HeartLogoIcon({ size = 18 }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left facet (Warm Coral Orange-Red #F66127) */}
      <path d="M50 86 C48.5 84 12 55 12 32 C12 18 23 8 36 8 C43.5 8 48 13 50 18.5 L50 86 Z" fill="#F66127" />
      {/* Right facet (Deep Vibrant Red #D82A1E) */}
      <path d="M50 18.5 C52 13 56.5 8 64 8 C77 8 88 18 88 32 C88 55 51.5 84 50 86 L50 18.5 Z" fill="#D82A1E" />
    </svg>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }) {
  if (collapsed) return null;
  return (
    <p
      className="px-3 pt-3 pb-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#89899C]"
    >
      {label}
    </p>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({ path, icon: Icon, label, collapsed, badge = null, activeOverride = false }) {
  const location = useLocation();
  const active = activeOverride || location.pathname === path;

  return (
    <Link
      to={path}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center rounded-xl transition-all duration-150 select-none ${
        active
          ? "bg-[#E55F37] text-white shadow-sm shadow-[#E55F37]/25 font-semibold"
          : "text-[#89899C] hover:text-white hover:bg-white/5 font-medium"
      }`}
      style={{
        padding: collapsed ? "10px 0" : "10px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : 10,
      }}
    >
      <Icon
        size={16}
        className={`flex-shrink-0 transition-transform group-hover:scale-105 ${
          active ? "text-white" : "text-[#89899C] group-hover:text-white"
        }`}
      />

      <span
        className="text-[13px] leading-none whitespace-nowrap overflow-hidden transition-all duration-200"
        style={{
          width: collapsed ? 0 : "auto",
          opacity: collapsed ? 0 : 1,
        }}
      >
        {label}
      </span>
      
      {!collapsed && badge && (
        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed, onLogoutClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const role = user?.role || "admin";
  const userName = (user?.first_name || user?.last_name) ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : (user?.email || "Staff User");
  const userInitials = userName ? userName.substring(0, 1).toUpperCase() : "U";

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
          className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className="fixed lg:static top-0 left-0 h-full overflow-y-auto overflow-x-hidden z-50 flex flex-col flex-shrink-0 transition-all duration-300 bg-[#13121F] border-r border-white/10"
        style={{
          width: collapsed ? 64 : 240,
          transform: sidebarOpen ? "translateX(0)" : undefined,
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {/* Mobile close button */}
        <button
          className="lg:hidden absolute right-3 top-4 p-1.5 rounded-lg z-10 text-slate-400 hover:text-white"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={16} />
        </button>

        {/* Logo (Acts as Collapse Toggle) */}
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          className="flex items-center w-full text-left transition-all duration-300 hover:bg-white/5 rounded-xl cursor-pointer"
          style={{
            padding: collapsed ? "16px 0" : "12px 16px",
            margin: collapsed ? "8px auto" : "8px",
            justifyContent: collapsed ? "center" : "flex-start",
            width: collapsed ? "48px" : "calc(100% - 16px)",
            gap: collapsed ? 0 : 12
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="flex-shrink-0 flex items-center justify-center">
            <HeartLogoIcon size={22} />
          </div>

          <div
            className="overflow-hidden transition-all duration-300 whitespace-nowrap"
            style={{ width: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1 }}
          >
            <span className="text-[17px] leading-none tracking-tight font-semibold flex items-start text-white">
              <span>HeartLink</span>
              <span className="text-[9px] text-slate-400 font-normal ml-0.5">™</span>
            </span>
            <p className="text-[7px] tracking-[0.22em] uppercase mt-1 text-[#E55F37] font-bold">
              Portal
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="mx-5 mb-2 border-t border-white/10" />

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6 space-y-0.5">
          <SectionLabel label="Overview" collapsed={collapsed} />
          <NavItem path="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
          
          {(role === "admin" || role === "super_admin") && (
            <NavItem path="/analytics" icon={PieChart} label="Analytics" collapsed={collapsed} />
          )}

          {(role === "admin" || role === "super_admin") && (
            <>
              <SectionLabel label="Content" collapsed={collapsed} />
              <NavItem path="/foods" icon={Utensils} label="Food & Recipe Library" collapsed={collapsed} />
              <NavItem path="/exercises" icon={Dumbbell} label="Exercise Library" collapsed={collapsed} />
            </>
          )}

          <SectionLabel label="HSS Evaluation" collapsed={collapsed} />
          <NavItem path="/cases"       icon={ClipboardList} label="Case Review"          collapsed={collapsed} />
          <NavItem path="/calibration" icon={History}       label="Calibration History"  collapsed={collapsed} />

          {(role === "admin" || role === "super_admin") && (
            <>
              <SectionLabel label="Users & Feedback" collapsed={collapsed} />
              <NavItem path="/users"      icon={UserCog}       label="Users" collapsed={collapsed} />
              <NavItem path="/feedbacks"  icon={MessageSquare} label="Feedback"        collapsed={collapsed} />

              <SectionLabel label="System" collapsed={collapsed} />
              <NavItem path="/activity-log" icon={Activity}    label="Activity Log" collapsed={collapsed} />
              <NavItem path="/broadcasts" icon={Megaphone}     label="Announcements"      collapsed={collapsed} />
              <NavItem path="/settings"   icon={Settings}      label="Settings"        collapsed={collapsed} />
            </>
          )}
        </nav>

        {/* Bottom user strip */}
        <div className="mx-2 mb-4 flex flex-col items-center gap-2">
          {collapsed ? (
            <>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#E55F37] bg-[#36272B] text-[11px] font-bold border border-white/5"
                title={`${userName} (${role === "super_admin" ? "Super Admin" : (role === "admin" ? "System Admin" : "Expert Reviewer")})`}
              >
                {userInitials}
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center justify-center cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <div className="w-full p-2.5 rounded-xl border border-white/10 bg-[#1A1A1A] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[#E55F37] bg-[#36272B] text-[11px] font-bold border border-white/5"
                >
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{userName}</p>
                  <p className="text-[9px] text-[#89899C] font-bold uppercase tracking-wider truncate">
                    {role === "super_admin" ? "Super Admin" : (role === "admin" ? "System Admin" : "Expert Reviewer")}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-1.5 px-3 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;