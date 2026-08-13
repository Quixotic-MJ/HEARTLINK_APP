import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PieChart,
  Stethoscope,
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

function HeartOutlineIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SidebarLogo({ collapsed }) {
  return (
    <div className="flex items-center gap-3 px-5 py-5 mb-1">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center"
        style={{ borderColor: "rgba(15,23,42,0.2)" }}
      >
        <HeartOutlineIcon size={15} color="#0f172a" />
      </div>

      <div
        className="overflow-hidden transition-all duration-300 whitespace-nowrap"
        style={{ width: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1 }}
      >
        <span className="text-[15px] leading-none tracking-tight" style={{ color: "#0f172a" }}>
          <span style={{ fontWeight: 300 }}>Heart</span>
          <span style={{ fontWeight: 700 }}>Link</span>
          <span style={{ fontWeight: 700 }}>.</span>
        </span>
        <p className="text-[7px] tracking-[0.22em] uppercase mt-0.5" style={{ color: "rgba(15,23,42,0.35)", fontWeight: 400 }}>
          Atelier
        </p>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }) {
  return (
    <div className="mt-5 mb-1 px-2">
      {collapsed
        ? <div className="h-px w-5 mx-auto rounded-full" style={{ backgroundColor: "rgba(15,23,42,0.1)" }} />
        : <p className="text-[9px] font-semibold tracking-[0.18em] uppercase" style={{ color: "rgba(15,23,42,0.35)" }}>{label}</p>
      }
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({ path, icon: Icon, label, collapsed }) {
  const { pathname } = useLocation();
  const isActive = pathname === path || (path !== "/" && pathname.startsWith(path + "/"));

  return (
    <Link
      to={path}
      title={collapsed ? label : undefined}
      className="flex items-center rounded-xl transition-all group"
      style={{
        padding: collapsed ? "9px" : "8px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        backgroundColor: isActive ? "#0f172a" : "transparent",
        color: isActive ? "#ffffff" : "rgba(15,23,42,0.5)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "rgba(15,23,42,0.05)";
          e.currentTarget.style.color = "#0f172a";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "rgba(15,23,42,0.5)";
        }
      }}
    >
      <Icon
        size={15}
        strokeWidth={isActive ? 2.5 : 1.8}
        style={{ flexShrink: 0, color: isActive ? "#ffffff" : "inherit" }}
      />
      <span
        className="overflow-hidden whitespace-nowrap transition-all duration-300 text-xs font-medium"
        style={{ width: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1, marginLeft: collapsed ? 0 : 9 }}
      >
        {label}
      </span>
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }) => {
  const { user, userId, logout } = useAuth();
  const navigate = useNavigate();
  
  const role = user?.role || (userId === "usr-chief-admin-001" ? "admin" : "medical_expert");
  const userName = user?.first_name ? `${user.first_name} ${user.last_name}` : (userId === "usr-chief-admin-001" ? "System Admin" : "Medical Expert");
  const userEmail = user?.email || (userId === "usr-chief-admin-001" ? "admin@heartlink.ph" : "expert@heartlink.ph");
  const userInitials = userName.substring(0, 1).toUpperCase();

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
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-colors"
            style={{ borderColor: "rgba(15,23,42,0.2)", backgroundColor: "#fff" }}
          >
            <HeartOutlineIcon size={15} color="#0f172a" />
          </div>

          <div
            className="overflow-hidden transition-all duration-300 whitespace-nowrap"
            style={{ width: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1 }}
          >
            <span className="text-[15px] leading-none tracking-tight" style={{ color: "#0f172a" }}>
              <span style={{ fontWeight: 300 }}>Heart</span>
              <span style={{ fontWeight: 700 }}>Link</span>
              <span style={{ fontWeight: 700 }}>.</span>
            </span>
            <p className="text-[7px] tracking-[0.22em] uppercase mt-0.5" style={{ color: "rgba(15,23,42,0.35)", fontWeight: 400 }}>
              Atelier
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="mx-5 mb-2" style={{ height: 1, backgroundColor: "rgba(15,23,42,0.06)" }} />

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6 space-y-0.5">
          <SectionLabel label="Overview" collapsed={collapsed} />
          <NavItem path="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
          
          {role === "admin" && (
            <NavItem path="/analytics" icon={PieChart} label="Analytics" collapsed={collapsed} />
          )}

          {role === "admin" && (
            <>
              <SectionLabel label="Content" collapsed={collapsed} />
              <NavItem path="/foods" icon={Utensils} label="Food & Recipe Library" collapsed={collapsed} />
              <NavItem path="/exercises" icon={Dumbbell} label="Exercise Library" collapsed={collapsed} />
            </>
          )}

          <SectionLabel label="HSS Evaluation" collapsed={collapsed} />
          <NavItem path="/cases"       icon={ClipboardList} label="Case Review"          collapsed={collapsed} />
          <NavItem path="/calibration" icon={History}       label="Calibration History"  collapsed={collapsed} />

          {role === "admin" && (
            <>
              <SectionLabel label="Users & Feedback" collapsed={collapsed} />
              <NavItem path="/users"      icon={UserCog}       label="Users" collapsed={collapsed} />
              <NavItem path="/feedbacks"  icon={MessageSquare} label="Feedback"        collapsed={collapsed} />

              <SectionLabel label="System" collapsed={collapsed} />
              <NavItem path="/activity-log" icon={Activity}    label="Activity Log" collapsed={collapsed} />
              <NavItem path="/broadcasts" icon={Megaphone}     label="Broadcasts"      collapsed={collapsed} />
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
                title={`${userName} (${role === "admin" ? "System Admin" : "Medical Expert"})`}
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
                    {role === "admin" ? "System Admin" : "Medical Expert"}
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