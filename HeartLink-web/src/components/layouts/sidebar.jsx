import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  ChartColumn,
  ChevronUp,
  CircleHelp,
  CornerDownLeft,
  Crown,
  Database,
  Dumbbell,
  Ellipsis,
  EllipsisVertical,
  Gauge,
  HeartPulse,
  ListChecks,
  LogOut,
  Mail,
  Megaphone,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  UserPlus,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/useAuth";
import { canAccess } from "../../app/access";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDialogFocus } from "../../hooks/useDialogFocus";

// HL-083: the sidebar is a slide-in menu below the lg breakpoint (1024px) and always visible above it
const DESKTOP = "(min-width: 1024px)";
const subscribeToWidth = (onChange) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isDesktopWidth = () => window.matchMedia(DESKTOP).matches;

const BELL_PATH = "/api/admin/notifications";
const MORE_PATHS = ["/premium", "/broadcasts", "/activity-log"];

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
        <linearGradient id={`hl-tr-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="-122" x2="0" y2="30">
          <stop offset="0" stopColor="#2B84FF" />
          <stop offset="0.30" stopColor="#2E8DF5" />
          <stop offset="0.52" stopColor="#38B3B5" />
          <stop offset="0.68" stopColor="#5CC974" />
          <stop offset="0.81" stopColor="#B2D65A" />
          <stop offset="0.91" stopColor="#F7A63C" />
          <stop offset="1" stopColor="#FF9A2E" />
        </linearGradient>
        <linearGradient id={`hl-bl-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="-30" x2="0" y2="122">
          <stop offset="0" stopColor="#2B87FF" />
          <stop offset="0.45" stopColor="#2A86F5" />
          <stop offset="0.62" stopColor="#2D9BE0" />
          <stop offset="0.78" stopColor="#30BE9C" />
          <stop offset="1" stopColor="#33CC82" />
        </linearGradient>
        <linearGradient id={`hl-br-${uid}`} gradientUnits="userSpaceOnUse" x1="122" y1="0" x2="-32" y2="0">
          <stop offset="0" stopColor="#3FC98A" />
          <stop offset="0.30" stopColor="#7ACD68" />
          <stop offset="0.50" stopColor="#B6D85A" />
          <stop offset="0.70" stopColor="#C2D857" />
          <stop offset="0.85" stopColor="#F2A93C" />
          <stop offset="1" stopColor="#FF9A2E" />
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -79.20,-25.46 L -96.17,-42.43 A 38 38 0 0 1 -42.43,-96.17 L 28.28,-25.46" stroke="#FF4B4B" />
        <path d="M 25.46,-79.20 L 42.43,-96.17 A 38 38 0 0 1 96.17,-42.43 L 25.46,28.28" stroke={`url(#hl-tr-${uid})`} />
        <path d="M -25.46,79.20 L -42.43,96.17 A 38 38 0 0 1 -96.17,42.43 L -25.46,-28.28" stroke={`url(#hl-bl-${uid})`} />
        <path d="M 79.20,25.46 L 96.17,42.43 A 38 38 0 0 1 42.43,96.17 L -28.28,25.46" stroke={`url(#hl-br-${uid})`} />
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
  if (expertType === "Cardiologist") return "bg-cal-badge-orange/20 text-cal-ink";
  if (expertType === "Dietitian") return "bg-cal-badge-emerald/20 text-cal-ink";
  if (expertType === "Physical Therapist") return "bg-cal-badge-pink/15 text-cal-ink";
  return "bg-cal-surface-card text-cal-ink";
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }) {
  if (collapsed) {
    return <div className="mx-2 my-2 border-t border-cal-hairline" aria-hidden="true" />;
  }
  return (
    <div className="px-2.5 pt-4 pb-1.5 text-[12px] font-medium text-cal-muted select-none">
      {label}
    </div>
  );
}

// ─── Nav Item (Cal.com Category-Tab Spec) ─────────────────────────────────────
function NavItem({
  path,
  icon: Icon,
  label,
  collapsed,
  badge = null,
  activeOverride = false,
  onNavigate,
}) {
  const location = useLocation();
  const active = activeOverride || location.pathname === path;

  return (
    <Link
      to={path}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`group flex items-center rounded-[8px] text-[13.5px] leading-[1.4] transition-colors select-none ${
        collapsed ? "mx-auto h-9 w-9 justify-center p-0" : "gap-2.5 px-2.5 py-[7px]"
      } ${
        active
          ? "bg-cal-canvas text-cal-ink font-semibold border border-cal-hairline shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          : "border border-transparent text-cal-body font-medium hover:bg-cal-surface-card hover:text-cal-ink"
      }`}
    >
      <Icon
        size={16}
        strokeWidth={active ? 2.1 : 1.85}
        className={`shrink-0 transition-colors ${
          active ? "text-cal-ink" : "text-cal-muted group-hover:text-cal-ink"
        }`}
      />

      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}

      {!collapsed && badge !== null && badge > 0 && (
        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-cal-surface-card px-2 py-0.5 font-cal-mono text-[11px] font-medium text-cal-ink">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Quick Search / Command Dialog ────────────────────────────────────────────
function QuickSearchModal({ isOpen, onClose, items, userRole, onSelectPath, onSubmitRecordSearch }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useDialogFocus(isOpen, dialogRef, onClose);

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(trimmed) ||
        item.section.toLowerCase().includes(trimmed) ||
        item.path.toLowerCase().includes(trimmed)
    );
  }, [items, query]);

  if (!isOpen) return null;

  const trimmedQuery = query.trim();
  const safeIndex = Math.min(selectedIndex, Math.max(filteredItems.length - 1, 0));

  const recordSearchHint =
    userRole === "medical_expert"
      ? `Search patient or case reference for "${trimmedQuery}"`
      : `Search user profiles for "${trimmedQuery}"`;

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[safeIndex]) {
        onSelectPath(filteredItems[safeIndex].path);
      } else if (trimmedQuery) {
        onSubmitRecordSearch(trimmedQuery);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh] font-cal-sans">
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        {/* Search Input Header */}
        <div className="flex h-12 items-center gap-2.5 border-b border-cal-hairline px-3.5">
          <Search size={16} className="shrink-0 text-cal-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              userRole === "medical_expert"
                ? "Jump to page or search USR-… / CASE-…"
                : "Jump to page or search profiles…"
            }
            className="h-full w-full bg-transparent text-[14px] text-cal-ink placeholder:text-cal-muted outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-[6px] border border-cal-hairline bg-cal-surface-soft px-1.5 py-0.5 font-cal-mono text-[11px] text-cal-muted hover:text-cal-ink cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Filtered Navigation & Record Search */}
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {filteredItems.length > 0 && (
            <div className="px-2.5 pt-1.5 pb-1 text-[11.5px] font-medium text-cal-muted">
              Pages
            </div>
          )}

          {filteredItems.map((item, idx) => {
            const Icon = item.icon;
            const isHighlighted = idx === safeIndex;
            return (
              <button
                key={item.path}
                type="button"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => onSelectPath(item.path)}
                className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13.5px] transition-colors cursor-pointer ${
                  isHighlighted
                    ? "bg-cal-surface-card text-cal-ink font-medium"
                    : "text-cal-body hover:bg-cal-surface-soft"
                }`}
              >
                <Icon size={15} className="shrink-0 text-cal-muted" />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="text-[11.5px] text-cal-muted">{item.section}</span>
              </button>
            );
          })}

          {trimmedQuery && (
            <div className="mt-1 border-t border-cal-hairline pt-1">
              <button
                type="button"
                onClick={() => onSubmitRecordSearch(trimmedQuery)}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] font-medium text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
              >
                <CornerDownLeft size={14} className="shrink-0 text-cal-muted" />
                <span className="flex-1 truncate">{recordSearchHint}</span>
              </button>
            </div>
          )}

          {filteredItems.length === 0 && !trimmedQuery && (
            <div className="py-8 text-center text-[13px] text-cal-muted">
              No matching pages found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────────────────
const Sidebar = ({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed, onLogoutClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const asideRef = useRef(null);
  const quickCreateRef = useRef(null);
  const userMenuRef = useRef(null);

  const [quickCreateState, setQuickCreateState] = useState({ open: false, path: "" });
  const [userMenuState, setUserMenuState] = useState({ open: false, path: "" });
  const [moreToggled, setMoreToggled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isDesktop = useSyncExternalStore(subscribeToWidth, isDesktopWidth);
  const isMobileMenu = !isDesktop;

  // HL-083: as a slide-in menu, Escape closes it, Tab stays inside, and focus returns to the menu button
  useDialogFocus(isMobileMenu && sidebarOpen && !searchOpen, asideRef, () => setSidebarOpen(false));

  // Shares cache with AdminNotificationDropdown so unread badge stays live with zero duplicate fetches
  const notificationsQuery = useApiQuery(BELL_PATH);
  const unreadCount = notificationsQuery.data?.unread_count || 0;

  const quickCreateOpen = quickCreateState.open && quickCreateState.path === location.pathname;
  const userMenuOpen = userMenuState.open && userMenuState.path === location.pathname;

  const role = user?.role || "admin";
  const expertType = user?.expert_type;
  const canOpen = (path) => canAccess(user, path);

  const userName =
    user?.first_name || user?.last_name
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : user?.name || user?.email || "Staff User";
  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "HL";
  const roleLabel = getRoleLabel(role, expertType);
  const userSubline = user?.email || roleLabel;
  const avatarSurface = getAvatarSurface(role, expertType);

  const isInMoreRoute = MORE_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
  );
  const showMoreItems = moreToggled || isInMoreRoute;

  // Close popovers on outside click or Escape
  useEffect(() => {
    if (!quickCreateOpen && !userMenuOpen) return;

    function handlePointerDown(event) {
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target)) {
        setQuickCreateState({ open: false, path: "" });
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuState({ open: false, path: "" });
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setQuickCreateState({ open: false, path: "" });
        setUserMenuState({ open: false, path: "" });
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [quickCreateOpen, userMenuOpen]);

  // Global Ctrl+K / Cmd+K shortcut for Sidebar Search
  useEffect(() => {
    function handleGlobalShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickCreateState({ open: false, path: "" });
        setUserMenuState({ open: false, path: "" });
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  const closeMobileIfNeeded = () => {
    if (isMobileMenu) setSidebarOpen(false);
  };

  const handleNavigate = (path) => {
    setQuickCreateState({ open: false, path: "" });
    setUserMenuState({ open: false, path: "" });
    setSearchOpen(false);
    closeMobileIfNeeded();
    navigate(path);
  };

  const handleRecordSearch = (trimmedQuery) => {
    setSearchOpen(false);
    closeMobileIfNeeded();
    if (role === "medical_expert") {
      // HL-081: experts see patients by reference only, and cases by their code
      const target = /^case/i.test(trimmedQuery) ? "/cases" : "/patients";
      navigate(`${target}?search=${encodeURIComponent(trimmedQuery)}`);
    } else {
      navigate(`/users?search=${encodeURIComponent(trimmedQuery)}`);
    }
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

  // Role-aware Quick Create actions
  const quickActions = [
    role === "admin" && { label: "Provision staff account", path: "/users", icon: UserPlus },
    role === "admin" && { label: "Send announcement", path: "/broadcasts", icon: Megaphone },
    canOpen("/foods") && { label: "Add food or recipe", path: "/foods", icon: Utensils },
    canOpen("/exercises") && { label: "Add exercise", path: "/exercises", icon: Dumbbell },
    role === "medical_expert" && canOpen("/patients") && {
      label: expertType === "Cardiologist" ? "Open cardiologist roster" : "Open patient roster",
      path: "/patients",
      icon: HeartPulse,
    },
    canOpen("/cases") && { label: "Review HSS cases", path: "/cases", icon: ListChecks },
    role === "medical_expert" && canOpen("/calibration") && {
      label: "Run model check",
      path: "/calibration",
      icon: Database,
    },
  ].filter(Boolean);

  // Permitted pages for Quick Search dialog
  const searchablePages = [
    canOpen("/dashboard") && { label: "Dashboard", path: "/dashboard", section: "Overview", icon: Gauge },
    canOpen("/cases") && { label: "Case Review", path: "/cases", section: "HSS Evaluation", icon: ListChecks },
    canOpen("/analytics") && { label: "Analytics", path: "/analytics", section: "Overview", icon: ChartColumn },
    canOpen("/patients") && {
      label: expertType === "Cardiologist" ? "Cardiologist dashboard" : "Patients",
      path: "/patients",
      section: "Care Team",
      icon: HeartPulse,
    },
    canOpen("/users") && { label: "Users", path: "/users", section: "Administration", icon: Users },
    canOpen("/foods") && { label: "Food & Recipes", path: "/foods", section: "Clinical & Library", icon: Utensils },
    canOpen("/exercises") && { label: "Exercise Library", path: "/exercises", section: "Clinical & Library", icon: Dumbbell },
    canOpen("/calibration") && { label: "Model Check", path: "/calibration", section: "Clinical & Library", icon: Database },
    canOpen("/premium") && { label: "Premium", path: "/premium", section: "Governance", icon: Crown },
    canOpen("/broadcasts") && { label: "Announcements", path: "/broadcasts", section: "Governance", icon: Megaphone },
    canOpen("/activity-log") && { label: "Activity Log", path: "/activity-log", section: "Governance", icon: Activity },
    canOpen("/feedbacks") && { label: "Feedback & Help", path: "/feedbacks", section: "Support", icon: CircleHelp },
    canOpen("/notifications") && { label: "Notifications", path: "/notifications", section: "Inbox", icon: Bell },
    canOpen("/settings") && { label: "Settings", path: "/settings", section: "System", icon: Settings },
  ].filter(Boolean);

  const isNotificationsActive = location.pathname === "/notifications";

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-cal-ink/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container (Cal.com Surface Soft + 1px Hairline) */}
      <aside
        ref={asideRef}
        aria-label="Main menu"
        role={isMobileMenu && sidebarOpen ? "dialog" : undefined}
        aria-modal={isMobileMenu && sidebarOpen ? "true" : undefined}
        // Off screen on a phone-sized window: keep its links out of Tab and screen readers until it's opened
        inert={isMobileMenu && !sidebarOpen}
        className={`fixed lg:sticky top-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-cal-hairline bg-cal-surface-soft font-cal-sans text-cal-ink transition-[width,transform] duration-200 select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: collapsed ? 68 : 256,
        }}
      >
        {/* ─── 1. Brand / Workspace Switcher Header ─────────────────────────── */}
        <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
          <button
            type="button"
            onClick={() => {
              if (isMobileMenu) {
                setSidebarOpen(false);
              } else {
                setCollapsed((prev) => !prev);
              }
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`group flex h-10 items-center rounded-[8px] border border-cal-hairline/80 bg-cal-surface-card/70 hover:bg-cal-surface-card transition-colors cursor-pointer ${
              collapsed ? "mx-auto w-10 justify-center px-0" : "w-full gap-2.5 px-2.5 text-left"
            }`}
          >
            <HeartLogoIcon size={20} />
            {!collapsed && (
              <>
                <span className="font-cal-display text-[15.5px] font-semibold tracking-[-0.5px] text-cal-ink leading-none truncate">
                  HeartLink
                </span>
                <PanelLeftClose
                  size={15}
                  className="ml-auto hidden shrink-0 text-cal-muted opacity-0 group-hover:opacity-100 transition-opacity lg:block"
                />
              </>
            )}
          </button>

          {isMobileMenu && !collapsed && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink lg:hidden cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ─── 2. Quick Create CTA + Inbox Action Row ───────────────────────── */}
        <div className="relative px-3 pb-2.5" ref={quickCreateRef}>
          <div className={collapsed ? "flex flex-col items-center gap-1.5" : "flex items-center gap-2"}>
            <button
              type="button"
              onClick={() =>
                setQuickCreateState((prev) => ({
                  open: !(prev.open && prev.path === location.pathname),
                  path: location.pathname,
                }))
              }
              aria-expanded={quickCreateOpen}
              aria-haspopup="menu"
              title={collapsed ? "Quick Create" : undefined}
              className={`flex h-9 items-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active text-cal-on-primary text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors cursor-pointer ${
                collapsed ? "w-9 justify-center px-0" : "flex-1 gap-2 px-3 text-left"
              }`}
            >
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cal-on-primary text-cal-primary">
                <Plus size={11} strokeWidth={3} />
              </span>
              {!collapsed && <span className="truncate">Quick Create</span>}
            </button>

            {canOpen("/notifications") && (
              <Link
                to="/notifications"
                onClick={closeMobileIfNeeded}
                aria-label="Notifications inbox"
                title={
                  unreadCount > 0
                    ? `Notifications (${unreadCount} unread)`
                    : "Notifications"
                }
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border bg-cal-canvas transition-colors ${
                  isNotificationsActive
                    ? "border-cal-ink text-cal-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    : "border-cal-hairline text-cal-body hover:bg-cal-surface-card hover:text-cal-ink"
                }`}
              >
                <Mail size={15} strokeWidth={1.9} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cal-primary ring-2 ring-cal-canvas" />
                )}
              </Link>
            )}
          </div>

          {/* Quick Create Popover */}
          {quickCreateOpen && (
            <div
              role="menu"
              aria-label="Quick create actions"
              className={`absolute z-50 rounded-[12px] border border-cal-hairline bg-cal-canvas p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
                collapsed ? "left-[calc(100%+8px)] top-0 w-[232px]" : "left-3 right-3 top-[calc(100%+2px)]"
              }`}
            >
              <div className="px-2.5 py-1.5 text-[11.5px] font-medium text-cal-muted">
                Quick Create
              </div>
              <div className="space-y-0.5">
                {quickActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.path + action.label}
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavigate(action.path)}
                      className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                    >
                      <ActionIcon size={15} className="shrink-0 text-cal-muted" />
                      <span className="truncate">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── 3. Scrollable Navigation Sections ────────────────────────────── */}
        <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* HL-034: each link shows only to people who can open it (app/access.js) */}
          {/* Primary Top-Level Navigation */}
          <div className="space-y-0.5">
            {canOpen("/dashboard") && (
              <NavItem
                path="/dashboard"
                icon={Gauge}
                label="Dashboard"
                collapsed={collapsed}
                onNavigate={closeMobileIfNeeded}
              />
            )}

            {canOpen("/cases") && (
              <NavItem
                path="/cases"
                icon={ListChecks}
                label="Case Review"
                collapsed={collapsed}
                activeOverride={location.pathname.startsWith("/cases/")}
                onNavigate={closeMobileIfNeeded}
              />
            )}

            {canOpen("/analytics") && (
              <NavItem
                path="/analytics"
                icon={ChartColumn}
                label="Analytics"
                collapsed={collapsed}
                onNavigate={closeMobileIfNeeded}
              />
            )}

            {canOpen("/patients") && (
              <NavItem
                path="/patients"
                icon={HeartPulse}
                label={expertType === "Cardiologist" ? "Cardiologist dashboard" : "Patients"}
                collapsed={collapsed}
                activeOverride={location.pathname.startsWith("/patients/")}
                onNavigate={closeMobileIfNeeded}
              />
            )}

            {canOpen("/users") && (
              <NavItem
                path="/users"
                icon={Users}
                label="Users"
                collapsed={collapsed}
                activeOverride={location.pathname.startsWith("/users/")}
                onNavigate={closeMobileIfNeeded}
              />
            )}
          </div>

          {/* Secondary Section: Clinical & Library ("Documents" equivalent) */}
          {(canOpen("/foods") || canOpen("/exercises") || canOpen("/calibration") || role === "admin") && (
            <div className="space-y-0.5">
              <SectionLabel label="Clinical & Library" collapsed={collapsed} />

              {canOpen("/foods") && (
                <NavItem
                  path="/foods"
                  icon={Utensils}
                  label="Food & Recipes"
                  collapsed={collapsed}
                  onNavigate={closeMobileIfNeeded}
                />
              )}

              {canOpen("/exercises") && (
                <NavItem
                  path="/exercises"
                  icon={Dumbbell}
                  label="Exercise Library"
                  collapsed={collapsed}
                  onNavigate={closeMobileIfNeeded}
                />
              )}

              {canOpen("/calibration") && (
                <NavItem
                  path="/calibration"
                  icon={Database}
                  label="Model Check"
                  collapsed={collapsed}
                  onNavigate={closeMobileIfNeeded}
                />
              )}

              {/* Expandable More Items for Admin Governance */}
              {role === "admin" && (
                <>
                  {showMoreItems ? (
                    <>
                      <NavItem
                        path="/premium"
                        icon={Crown}
                        label="Premium"
                        collapsed={collapsed}
                        onNavigate={closeMobileIfNeeded}
                      />
                      <NavItem
                        path="/broadcasts"
                        icon={Megaphone}
                        label="Announcements"
                        collapsed={collapsed}
                        onNavigate={closeMobileIfNeeded}
                      />
                      <NavItem
                        path="/activity-log"
                        icon={Activity}
                        label="Activity Log"
                        collapsed={collapsed}
                        onNavigate={closeMobileIfNeeded}
                      />
                      {!isInMoreRoute && (
                        <button
                          type="button"
                          onClick={() => setMoreToggled(false)}
                          title={collapsed ? "Show less" : undefined}
                          className={`group flex w-full items-center rounded-[8px] border border-transparent text-[13.5px] font-medium text-cal-muted hover:bg-cal-surface-card hover:text-cal-ink transition-colors cursor-pointer ${
                            collapsed ? "mx-auto h-9 w-9 justify-center p-0" : "gap-2.5 px-2.5 py-[7px] text-left"
                          }`}
                        >
                          <ChevronUp size={16} strokeWidth={1.85} className="shrink-0" />
                          {!collapsed && <span className="truncate">Less</span>}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMoreToggled(true)}
                      title={collapsed ? "More" : undefined}
                      className={`group flex w-full items-center rounded-[8px] border border-transparent text-[13.5px] font-medium text-cal-muted hover:bg-cal-surface-card hover:text-cal-ink transition-colors cursor-pointer ${
                        collapsed ? "mx-auto h-9 w-9 justify-center p-0" : "gap-2.5 px-2.5 py-[7px] text-left"
                      }`}
                    >
                      <Ellipsis size={16} strokeWidth={1.85} className="shrink-0" />
                      {!collapsed && <span className="truncate">More</span>}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Bottom Utility Group (Settings / Help & Feedback / Search) */}
          <div className="mt-auto pt-6 pb-1 space-y-0.5">
            {canOpen("/settings") && (
              <NavItem
                path="/settings"
                icon={Settings}
                label="Settings"
                collapsed={collapsed}
                onNavigate={closeMobileIfNeeded}
              />
            )}

            {canOpen("/feedbacks") ? (
              <NavItem
                path="/feedbacks"
                icon={CircleHelp}
                label="Get Help"
                collapsed={collapsed}
                onNavigate={closeMobileIfNeeded}
              />
            ) : (
              canOpen("/notifications") && (
                <NavItem
                  path="/notifications"
                  icon={CircleHelp}
                  label="Help & Alerts"
                  collapsed={collapsed}
                  badge={unreadCount}
                  onNavigate={closeMobileIfNeeded}
                />
              )
            )}

            <button
              type="button"
              onClick={() => {
                setQuickCreateState({ open: false, path: "" });
                setUserMenuState({ open: false, path: "" });
                setSearchOpen(true);
              }}
              title={collapsed ? "Search (Ctrl+K)" : undefined}
              className={`group flex w-full items-center rounded-[8px] border border-transparent text-[13.5px] font-medium text-cal-body hover:bg-cal-surface-card hover:text-cal-ink transition-colors cursor-pointer ${
                collapsed ? "mx-auto h-9 w-9 justify-center p-0" : "gap-2.5 px-2.5 py-[7px] text-left"
              }`}
            >
              <Search
                size={16}
                strokeWidth={1.85}
                className="shrink-0 text-cal-muted group-hover:text-cal-ink transition-colors"
              />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">Search</span>
                  <span className="font-cal-mono text-[11px] text-cal-muted">Ctrl K</span>
                </>
              )}
            </button>
          </div>
        </nav>

        {/* ─── 4. Bottom User Profile Footer (NavUser + Account Menu) ──────── */}
        <div className="relative border-t border-cal-hairline bg-cal-surface-soft p-2.5" ref={userMenuRef}>
          <button
            type="button"
            onClick={() =>
              setUserMenuState((prev) => ({
                open: !(prev.open && prev.path === location.pathname),
                path: location.pathname,
              }))
            }
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            title={collapsed ? `${userName} (${userSubline})` : undefined}
            className={`group flex items-center rounded-[8px] transition-colors hover:bg-cal-surface-card cursor-pointer ${
              collapsed ? "mx-auto h-10 w-10 justify-center p-0" : "w-full gap-2.5 p-1.5 text-left"
            }`}
          >
            {/* Cal.com 36px Circular Avatar */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline text-[12.5px] font-semibold ${avatarSurface}`}
            >
              {userInitials}
            </div>

            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold leading-tight text-cal-ink">
                    {userName}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] leading-tight text-cal-muted">
                    {userSubline}
                  </div>
                </div>
                <EllipsisVertical
                  size={16}
                  className="shrink-0 text-cal-muted group-hover:text-cal-ink transition-colors"
                />
              </>
            )}
          </button>

          {/* User Account Popover Menu */}
          {userMenuOpen && (
            <div
              role="menu"
              aria-label="Account menu"
              className={`absolute z-50 rounded-[12px] border border-cal-hairline bg-cal-canvas p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
                collapsed
                  ? "bottom-2.5 left-[calc(100%+8px)] w-[244px]"
                  : "bottom-[calc(100%+6px)] left-2.5 right-2.5"
              }`}
            >
              {/* Signed-in Identity Summary */}
              <div className="flex items-start gap-2.5 border-b border-cal-hairline px-2.5 py-2.5 mb-1">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline text-[12.5px] font-semibold ${avatarSurface}`}
                >
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-cal-ink leading-tight">
                    {userName}
                  </p>
                  {user?.email && (
                    <p className="mt-0.5 truncate text-[11.5px] text-cal-muted">
                      {user.email}
                    </p>
                  )}
                  <span className="mt-1.5 inline-flex items-center rounded-full bg-cal-surface-card px-2.5 py-0.5 text-[11px] font-medium text-cal-ink">
                    {roleLabel}
                  </span>
                </div>
              </div>

              {canOpen("/notifications") && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate("/notifications")}
                  className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  <Bell size={15} className="shrink-0 text-cal-muted" />
                  <span className="flex-1 truncate">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-cal-surface-card px-2 py-0.5 font-cal-mono text-[11px] font-medium text-cal-ink">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {canOpen("/settings") && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate("/settings")}
                  className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  <Settings size={15} className="shrink-0 text-cal-muted" />
                  <span className="truncate">Settings</span>
                </button>
              )}

              <div className="my-1 border-t border-cal-hairline" />

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

      {/* Quick Search Modal (Ctrl+K / Sidebar Search button) */}
      <QuickSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={searchablePages}
        userRole={role}
        onSelectPath={handleNavigate}
        onSubmitRecordSearch={handleRecordSearch}
      />
    </>
  );
};

export default Sidebar;
