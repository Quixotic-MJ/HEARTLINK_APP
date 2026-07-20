import React from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";

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
  const isActive = pathname === path;

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
          <NavItem path="/dashboard" icon={LayoutDashboard} label="Dashboard"  collapsed={collapsed} />
          <NavItem path="/analytics" icon={PieChart}        label="Analytics"  collapsed={collapsed} />

          <SectionLabel label="Management" collapsed={collapsed} />
          <NavItem path="/foods"       icon={Utensils}    label="Food & Meal Library"   collapsed={collapsed} />
          <NavItem path="/exercises"   icon={Dumbbell}    label="Exercise library" collapsed={collapsed} />

          <SectionLabel label="Calibration" collapsed={collapsed} />
          <NavItem path="/cases"       icon={ClipboardList} label="Case review"          collapsed={collapsed} />
          <NavItem path="/calibration" icon={History}       label="Calibration history"  collapsed={collapsed} />
          <NavItem path="/alerts"      icon={Activity}      label="Alert monitoring"     collapsed={collapsed} />

          <SectionLabel label="System" collapsed={collapsed} />
          <NavItem path="/users"      icon={UserCog}       label="User management" collapsed={collapsed} />
          <NavItem path="/feedbacks"  icon={MessageSquare} label="Feedback"        collapsed={collapsed} />
          <NavItem path="/broadcasts" icon={Megaphone}     label="Broadcasts"      collapsed={collapsed} />
          <NavItem path="/settings"   icon={Settings}      label="Settings"        collapsed={collapsed} />
        </nav>

        {/* Bottom user strip */}
        {!collapsed && (
          <div
            className="mx-3 mb-4 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
            style={{ backgroundColor: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.06)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-semibold"
              style={{ backgroundColor: "#0f172a" }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">System Admin</p>
              <p className="text-[10px] text-slate-400 truncate">admin@heartlink.ph</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;