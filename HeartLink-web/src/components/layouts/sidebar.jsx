import { useRef, useSyncExternalStore } from "react";
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
  HeartPulse,
  X,
  LogOut,
  Crown,
} from "lucide-react";
import { useAuth } from "../../contexts/useAuth";
import { canAccess } from "../../app/access";
import { useDialogFocus } from "../../hooks/useDialogFocus";

// HL-083: the sidebar is a slide-in menu below the lg breakpoint (1024px) and always visible above it
const DESKTOP = "(min-width: 1024px)";
const subscribeToWidth = (onChange) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isDesktopWidth = () => window.matchMedia(DESKTOP).matches;

// ─── Brand Logo Emblem ────────────────────────────────────────────────────────
function HeartLogoIcon({ size = 24 }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="-132 -132 264 264" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
      aria-label="HeartLink icon"
    >
      <defs>
        <linearGradient id="hl-topright" gradientUnits="userSpaceOnUse" x1="0" y1="-122" x2="0" y2="30">
          <stop offset="0" stopColor="#2B84FF"/><stop offset="0.30" stopColor="#2E8DF5"/>
          <stop offset="0.52" stopColor="#38B3B5"/><stop offset="0.68" stopColor="#5CC974"/>
          <stop offset="0.81" stopColor="#B2D65A"/><stop offset="0.91" stopColor="#F7A63C"/>
          <stop offset="1" stopColor="#FF9A2E"/>
        </linearGradient>
        <linearGradient id="hl-bottomleft" gradientUnits="userSpaceOnUse" x1="0" y1="-30" x2="0" y2="122">
          <stop offset="0" stopColor="#2B87FF"/><stop offset="0.45" stopColor="#2A86F5"/>
          <stop offset="0.62" stopColor="#2D9BE0"/><stop offset="0.78" stopColor="#30BE9C"/>
          <stop offset="1" stopColor="#33CC82"/>
        </linearGradient>
        <linearGradient id="hl-bottomright" gradientUnits="userSpaceOnUse" x1="122" y1="0" x2="-32" y2="0">
          <stop offset="0" stopColor="#3FC98A"/><stop offset="0.30" stopColor="#7ACD68"/>
          <stop offset="0.50" stopColor="#B6D85A"/><stop offset="0.70" stopColor="#C2D857"/>
          <stop offset="0.85" stopColor="#F2A93C"/><stop offset="1" stopColor="#FF9A2E"/>
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -79.20,-25.46 L -96.17,-42.43 A 38 38 0 0 1 -42.43,-96.17 L 28.28,-25.46" stroke="#FF4B4B"/>
        <path d="M 25.46,-79.20 L 42.43,-96.17 A 38 38 0 0 1 96.17,-42.43 L 25.46,28.28" stroke="url(#hl-topright)"/>
        <path d="M -25.46,79.20 L -42.43,96.17 A 38 38 0 0 1 -96.17,42.43 L -25.46,-28.28" stroke="url(#hl-bottomleft)"/>
        <path d="M 79.20,25.46 L 96.17,42.43 A 38 38 0 0 1 42.43,96.17 L -28.28,25.46" stroke="url(#hl-bottomright)"/>
      </g>
    </svg>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }) {
  if (collapsed) return null;
  return (
    <div className="text-[11px] text-ds-steel font-semibold px-2.5 pt-3.5 pb-1.5 select-none">
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
          ? "bg-ds-tint text-ds-on-tint font-semibold "
          : "text-ds-slate hover:bg-ds-surface hover:text-ds-ink"
      }`}
      style={{
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? "9px 0" : "8px 10px",
      }}
    >
      <Icon
        size={15}
        className={`shrink-0 transition-transform ${
          active ? "text-ds-on-tint" : "text-ds-steel group-hover:text-ds-ink"
        }`}
        strokeWidth={active ? 2.5 : 2}
      />

      {!collapsed && (
        <span className="leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">
          {label}
        </span>
      )}
      
      {!collapsed && badge && (
        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-ds-primary text-white text-[11px] font-semibold">
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
  const location = useLocation();
  const asideRef = useRef(null);
  const isDesktop = useSyncExternalStore(subscribeToWidth, isDesktopWidth);
  const isMobileMenu = !isDesktop;
  // HL-083: as a slide-in menu, Escape closes it, Tab stays inside, and focus returns to the menu button
  useDialogFocus(isMobileMenu && sidebarOpen, asideRef, () => setSidebarOpen(false));
  
  const role = user?.role || "admin";
  const canOpen = (path) => canAccess(user, path);
  const userName = (user?.first_name || user?.last_name) 
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() 
    : (user?.email || "Staff User");
  const userInitials = userName ? userName.substring(0, 2).toUpperCase() : "HL";

  const getRoleLabel = (r) => {
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
        ref={asideRef}
        aria-label="Main menu"
        role={isMobileMenu && sidebarOpen ? "dialog" : undefined}
        aria-modal={isMobileMenu && sidebarOpen ? "true" : undefined}
        // Off screen on a phone-sized window: keep its links out of Tab and screen readers until it's opened
        inert={isMobileMenu && !sidebarOpen}
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col shrink-0 bg-ds-canvas border-r border-ds-hairline transition-all duration-200 select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: collapsed ? 64 : 240,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Mobile close button */}
        <button
          className="lg:hidden absolute right-3 top-3.5 p-1 rounded-lg text-ds-slate hover:text-ds-ink hover:bg-ds-surface"
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
                className="text-[16px] font-medium leading-[1.1] text-ds-ink"
              >
                HeartLink
              </div>
              <div className="text-[11px] font-semibold text-ds-primary-pressed mt-0.5">
                Admin portal
              </div>
            </div>
          )}
        </button>

        <div className="mx-4 mb-2 border-t border-ds-hairline" />

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* HL-034: each link shows only to people who can open it (app/access.js) */}
          {canOpen("/dashboard") && (
            <>
              <SectionLabel label="Overview" collapsed={collapsed} />
              <NavItem path="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
              {canOpen("/analytics") && <NavItem path="/analytics" icon={PieChart} label="Analytics" collapsed={collapsed} />}
              {canOpen("/notifications") && <NavItem path="/notifications" icon={Bell} label="Notifications" collapsed={collapsed} />}
            </>
          )}

          {canOpen("/patients") && (
            <>
              <SectionLabel label="Care team" collapsed={collapsed} />
              <NavItem
                path="/patients"
                icon={HeartPulse}
                label={user?.expert_type === "Cardiologist" ? "Cardiologist dashboard" : "Patients"}
                collapsed={collapsed}
                activeOverride={location.pathname.startsWith("/patients/")}
              />
            </>
          )}

          {(canOpen("/foods") || canOpen("/exercises")) && (
            <>
              <SectionLabel label="Content" collapsed={collapsed} />
              {canOpen("/foods") && <NavItem path="/foods" icon={Utensils} label="Food & recipe library" collapsed={collapsed} />}
              {canOpen("/exercises") && <NavItem path="/exercises" icon={Dumbbell} label="Exercise library" collapsed={collapsed} />}
            </>
          )}

          <SectionLabel label="HSS evaluation" collapsed={collapsed} />
          <NavItem path="/cases" icon={ClipboardList} label="Case review" collapsed={collapsed} />
          <NavItem path="/calibration" icon={History} label="Model Check" collapsed={collapsed} />

          {role === "admin" && (
            <>
              <SectionLabel label="Users & feedback" collapsed={collapsed} />
              <NavItem path="/users" icon={Users} label="Users" collapsed={collapsed} />
              <NavItem path="/feedbacks" icon={MessageSquare} label="Feedback" collapsed={collapsed} />
              <NavItem path="/premium" icon={Crown} label="Premium" collapsed={collapsed} />

              <SectionLabel label="System" collapsed={collapsed} />
              <NavItem path="/activity-log" icon={Activity} label="Activity log" collapsed={collapsed} />
              <NavItem path="/broadcasts" icon={Megaphone} label="Announcements" collapsed={collapsed} />
              <NavItem path="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
            </>
          )}
        </nav>

        {/* Bottom User Footer Strip */}
        <div className="p-3 border-t border-ds-hairline bg-ds-canvas">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center bg-ds-tint text-ds-primary-pressed text-[11px] font-bold"
                title={`${userName} (${getRoleLabel(role)})`}
              >
                {userInitials}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-ds-steel hover:text-ds-danger transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-2 rounded-[9px] border border-ds-hairline bg-ds-surface">
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-ds-tint text-ds-primary-pressed text-[11px] font-bold">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-ds-ink truncate leading-tight">
                  {userName}
                </div>
                <div className="text-[11px] font-medium text-ds-slate truncate mt-0.5">
                  {getRoleLabel(role)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-ds-steel hover:text-ds-danger transition-colors cursor-pointer shrink-0"
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