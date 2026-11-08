import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { EllipsisVertical, LogOut, X } from "lucide-react";
import { useAuth } from "../../contexts/useAuth.js";
import { homeFor } from "../../app/access.js";
import { portalNavigationFor } from "../../app/portalNavigation.js";
import { useDialogFocus } from "../../hooks/useDialogFocus.js";

// HL-083: the sidebar is a slide-in menu below the lg breakpoint (1024px) and always visible above it
const DESKTOP = "(min-width: 1024px)";
const subscribeToWidth = (onChange) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isDesktopWidth = () => window.matchMedia(DESKTOP).matches;

// ─── Brand Logo Emblem (Exempted Brand Gradient Stops) ────────────────────────
function HeartLogoIcon({ size = 20 }) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="-132 -132 264 264"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient
          id={`hl-tr-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="-122"
          x2="0"
          y2="30"
        >
          <stop offset="0" stopColor="#2B84FF" />
          <stop offset="0.30" stopColor="#2E8DF5" />
          <stop offset="0.52" stopColor="#38B3B5" />
          <stop offset="0.68" stopColor="#5CC974" />
          <stop offset="0.81" stopColor="#B2D65A" />
          <stop offset="0.91" stopColor="#F7A63C" />
          <stop offset="1" stopColor="#FF9A2E" />
        </linearGradient>
        <linearGradient
          id={`hl-bl-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="-30"
          x2="0"
          y2="122"
        >
          <stop offset="0" stopColor="#2B87FF" />
          <stop offset="0.45" stopColor="#2A86F5" />
          <stop offset="0.62" stopColor="#2D9BE0" />
          <stop offset="0.78" stopColor="#30BE9C" />
          <stop offset="1" stopColor="#33CC82" />
        </linearGradient>
        <linearGradient
          id={`hl-br-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="122"
          y1="0"
          x2="-32"
          y2="0"
        >
          <stop offset="0" stopColor="#3FC98A" />
          <stop offset="0.30" stopColor="#7ACD68" />
          <stop offset="0.50" stopColor="#B6D85A" />
          <stop offset="0.70" stopColor="#C2D857" />
          <stop offset="0.85" stopColor="#F2A93C" />
          <stop offset="1" stopColor="#FF9A2E" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M -79.20,-25.46 L -96.17,-42.43 A 38 38 0 0 1 -42.43,-96.17 L 28.28,-25.46"
          stroke="#FF4B4B"
        />
        <path
          d="M 25.46,-79.20 L 42.43,-96.17 A 38 38 0 0 1 96.17,-42.43 L 25.46,28.28"
          stroke={`url(#hl-tr-${uid})`}
        />
        <path
          d="M -25.46,79.20 L -42.43,96.17 A 38 38 0 0 1 -96.17,42.43 L -25.46,-28.28"
          stroke={`url(#hl-bl-${uid})`}
        />
        <path
          d="M 79.20,25.46 L 96.17,42.43 A 38 38 0 0 1 42.43,96.17 L -28.28,25.46"
          stroke={`url(#hl-br-${uid})`}
        />
      </g>
    </svg>
  );
}

// ─── Role Helpers (Cal.com 36px Avatar Pastels) ───────────────────────────────
function getRoleLabel(role, expertType) {
  if (role === "admin") return "System Admin";
  if (role === "medical_expert") return expertType || "Medical Expert";
  return "Staff User";
}

function getAvatarSurface(role, expertType) {
  if (role === "admin") return "bg-cal-badge-violet/15 text-cal-ink";
  if (expertType === "Cardiologist")
    return "bg-cal-badge-orange/20 text-cal-ink";
  if (expertType === "Dietitian") return "bg-cal-badge-emerald/20 text-cal-ink";
  if (expertType === "Physical Therapist")
    return "bg-cal-badge-pink/15 text-cal-ink";
  return "bg-cal-surface-card text-cal-ink";
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }) {
  return (
    <div className="relative">
      <div
        className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          collapsed
            ? "max-h-0 opacity-0 my-0 py-0"
            : "max-h-12 opacity-100 px-2.5 pt-4 pb-1.5"
        }`}
      >
        <div className="text-[12px] font-medium text-cal-muted select-none truncate whitespace-nowrap">
          {label}
        </div>
      </div>
      {collapsed && (
        <div
          className="mx-2 my-2 border-t border-cal-hairline transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ─── Nav Item (Cal.com Category-Tab Spec + Sliding Active Animation) ─────────
function NavItem({
  path,
  icon: Icon,
  label,
  collapsed,
  activeOverride = false,
  onNavigate,
}) {
  const location = useLocation();
  const active = activeOverride || location.pathname === path;
  const reduceMotion = useReducedMotion();

  return (
    <Link
      to={path}
      aria-current={active ? "page" : undefined}
      data-active={active}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`portal-nav-item group relative flex items-center rounded-[10px] text-[13.5px] leading-[1.4] select-none transition-colors duration-150 ${
        collapsed
          ? "mx-auto h-9 w-9 justify-center p-0"
          : "gap-2.5 px-2.5 py-[7px]"
      } ${
        active
          ? "text-cal-ink font-semibold"
          : "text-cal-body font-medium hover:bg-cal-surface-card hover:text-cal-ink active:scale-[0.98]"
      }`}
    >
      {/* ─── Sliding Active Indicator Pill (Motion Layout) ─── */}
      {active && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="portal-nav-active absolute inset-0 rounded-[10px]"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 380, damping: 32 }
          }
        />
      )}

      {/* ─── Sliding Primary Accent Bar on Left Edge ─── */}
      {active && !collapsed && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--shell-accent)]"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 380, damping: 32 }
          }
        />
      )}

      <Icon
        size={16}
        strokeWidth={active ? 2.1 : 1.85}
        className={`relative z-10 shrink-0 transition-transform duration-200  ${
          active
            ? "text-[var(--shell-accent)]"
            : "text-cal-muted group-hover:text-cal-ink"
        }`}
      />

      <div
        className={`relative z-10 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          collapsed
            ? "max-w-0 opacity-0 pointer-events-none"
            : "flex-1 max-w-[170px] opacity-100"
        }`}
      >
        <span className="truncate whitespace-nowrap block">{label}</span>
      </div>

    </Link>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────────────────
const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  collapsed: collapsedProp,
  onLogoutClick,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const asideRef = useRef(null);
  const userMenuRef = useRef(null);
  const userMenuButtonRef = useRef(null);

  const [userMenuState, setUserMenuState] = useState({ open: false, path: "" });

  const isDesktop = useSyncExternalStore(subscribeToWidth, isDesktopWidth);
  const isMobileMenu = !isDesktop;
  const collapsed = isDesktop && collapsedProp;
  const pages = portalNavigationFor(user);

  // HL-083: as a slide-in menu, Escape closes it, Tab stays inside, and focus returns to the menu button
  useDialogFocus(isMobileMenu && sidebarOpen, asideRef, () =>
    setSidebarOpen(false),
  );

  const userMenuOpen =
    userMenuState.open && userMenuState.path === location.pathname;

  const role = user?.role;
  const expertType = user?.expert_type;

  const userName =
    user?.first_name || user?.last_name
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : user?.name || user?.email || "Staff User";
  const userInitials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "HL";
  const roleLabel = getRoleLabel(role, expertType);
  const userSubline = user?.email || roleLabel;
  const avatarSurface = getAvatarSurface(role, expertType);

  // Close popovers on outside click or Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    userMenuRef.current?.querySelector('[role="menuitem"]')?.focus();

    function handlePointerDown(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuState({ open: false, path: "" });
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setUserMenuState({ open: false, path: "" });
        userMenuButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen]);

  const closeMobileIfNeeded = () => {
    if (isMobileMenu) setSidebarOpen(false);
  };

  const handleLogout = () => {
    setUserMenuState({ open: false, path: "" });
    closeMobileIfNeeded();
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      logout();
      navigate("/login");
    }
  };

  const menu = (
    <>
      {/* Mobile overlay with smooth fade + blur */}
      <div
        className={`fixed inset-0 z-50 bg-cal-ink/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar container (Cal.com Surface Soft + 1px Hairline) */}
      <aside
        ref={asideRef}
        id="portal-sidebar"
        data-workspace={
          location.pathname === "/foods"
            ? "recipes"
            : location.pathname === "/exercises"
              ? "exercises"
              : "operations"
        }
        data-collapsed={collapsed}
        aria-label="Main menu"
        role={isMobileMenu && sidebarOpen ? "dialog" : undefined}
        aria-modal={isMobileMenu && sidebarOpen ? "true" : undefined}
        // Off screen on a phone-sized window: keep its links out of Tab and screen readers until it's opened
        inert={isMobileMenu && !sidebarOpen}
        className={`fixed lg:sticky top-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-cal-hairline bg-cal-canvas font-cal-sans text-cal-ink portal-sidebar transition-[width,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-[width,transform] select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: collapsed ? 72 : 240,
        }}
      >
        <div className="portal-brand-row">
          <Link
            to={homeFor(user)}
            aria-label="HeartLink home"
            className="portal-brand"
            onClick={closeMobileIfNeeded}
          >
            <HeartLogoIcon size={25} />
            {!collapsed && (
              <span>
                HeartLink<small>Staff portal</small>
              </span>
            )}
          </Link>
          {isMobileMenu && (
            <button
              type="button"
              className="portal-icon-button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <nav aria-label="Main navigation" className="portal-navigation">
          {["Workspace", "Content", "Operations"].map((section) => {
            const items = pages.filter((page) => page.section === section);
            return items.length ? (
              <div key={section}>
                <SectionLabel label={section} collapsed={collapsed} />
                {items.map((page) => (
                  <NavItem
                    key={page.path}
                    {...page}
                    collapsed={collapsed}
                    activeOverride={
                      page.path === "/users" &&
                      location.pathname.startsWith("/users/")
                    }
                    onNavigate={closeMobileIfNeeded}
                  />
                ))}
              </div>
            ) : null;
          })}
        </nav>

        {/* ─── 4. Bottom User Profile Footer (NavUser + Account Menu) ──────── */}
        <div
          className={`relative flex items-center gap-1 border-t border-cal-hairline bg-cal-surface-soft p-2.5 ${collapsed ? "flex-col" : ""}`}
          ref={userMenuRef}
        >
          <Link
            to="/settings"
            onClick={() => {
              setUserMenuState({ open: false, path: "" });
              closeMobileIfNeeded();
            }}
            aria-label="Account settings"
            title={collapsed ? `${userName} — Account settings` : "Account settings"}
            className={`group flex items-center rounded-[8px] transition-all duration-200 hover:bg-cal-surface-card active:scale-[0.98] cursor-pointer ${
              collapsed
                ? "mx-auto h-10 w-10 justify-center p-0"
                : "min-w-0 flex-1 gap-2.5 p-1.5 text-left"
            }`}
          >
            {/* Cal.com 36px Circular Avatar */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline text-[12.5px] font-semibold transition-transform duration-200 group-hover:scale-105 ${avatarSurface}`}
            >
              {userInitials}
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                collapsed
                  ? "max-w-0 opacity-0 pointer-events-none"
                  : "flex flex-1 min-w-0 items-center justify-between max-w-[180px] opacity-100"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold leading-tight text-cal-ink whitespace-nowrap">
                  {userName}
                </div>
                <div className="mt-0.5 truncate text-[12px] leading-tight text-cal-muted whitespace-nowrap">
                  {userSubline}
                </div>
              </div>
            </div>
          </Link>
          <button
            ref={userMenuButtonRef}
            type="button"
            onClick={() =>
              setUserMenuState((prev) => ({
                open: !(prev.open && prev.path === location.pathname),
                path: location.pathname,
              }))
            }
            aria-label="Account menu"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            title="Account menu"
            className="portal-icon-button"
          >
            <EllipsisVertical size={16} aria-hidden="true" />
          </button>

          {/* User Account Popover Menu */}
          {userMenuOpen && (
            <div
              role="menu"
              aria-label="Account menu"
              className={`absolute z-50 rounded-[12px] border border-cal-hairline bg-cal-canvas p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] animate-cal-popover ${
                collapsed
                  ? "bottom-2.5 left-[calc(100%+8px)] w-[244px]"
                  : "bottom-[calc(100%+6px)] left-2.5 right-2.5"
              }`}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
              >
                <LogOut size={15} className="shrink-0 text-cal-muted" />
                <span className="truncate">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );

  return <>{isMobileMenu ? createPortal(menu, document.body) : menu}</>;
};

export default Sidebar;
