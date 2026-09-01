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
      className="px-3 pt-3 pb-1 text-[8px] font-bold uppercase tracking-[0.2em]"
      style={{ color: "rgba(15,23,42,0.35)" }}
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
          ? "bg-[#0f172a] text-white shadow-sm font-semibold"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
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
          active ? "text-white" : "text-slate-500 group-hover:text-slate-800"
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
        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const role = user?.role || "admin";
  const userName = (user?.first_name || user?.last_name) ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : (user?.email || "Staff User");
  const userInitials = userName ? userName.substring(0, 1).toUpperCase() : "U";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className="fixed lg:static top-0 left-0 h-full overflow-y-auto overflow-x-hidden z-50 flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? 64 : 240,
          backgroundColor: "#f8fafc",
          borderRight: "1px solid rgba(15,23,42,0.06)",
          transform: sidebarOpen ? "translateX(0)" : undefined,
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {/* Mobile close button */}
        <button
          className="lg:hidden absolute right-3 top-4 p-1.5 rounded-lg z-10"
          style={{ color: "rgba(15,23,42,0.4)" }}
          onClick={() => setSidebarOpen(false)}
        >
          <X size={16} />
        </button>

        {/* Logo (Acts as Collapse Toggle) */}
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          className="flex items-center w-full text-left transition-all duration-300 hover:bg-slate-100 rounded-xl cursor-pointer"
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
            <span className="text-[17px] leading-none tracking-tight font-semibold flex items-start" style={{ color: "#0f172a" }}>
              <span>HeartLink</span>
              <span className="text-[9px] text-slate-400 font-normal ml-0.5">™</span>
            </span>
            <p className="text-[7px] tracking-[0.22em] uppercase mt-1" style={{ color: "rgba(15,23,42,0.45)", fontWeight: 500 }}>
              Portal
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="mx-5 mb-2" style={{ height: 1, backgroundColor: "rgba(15,23,42,0.06)" }} />

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
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                style={{ backgroundColor: "#0f172a" }}
                title={`${userName} (${role === "super_admin" ? "Super Admin" : (role === "admin" ? "System Admin" : "Expert Reviewer")})`}
              >
                {userInitials}
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors flex items-center justify-center cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <div className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-semibold"
                  style={{ backgroundColor: "#0f172a" }}
                >
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{userName}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">
                    {role === "super_admin" ? "Super Admin" : (role === "admin" ? "System Admin" : "Expert Reviewer")}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-1.5 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
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