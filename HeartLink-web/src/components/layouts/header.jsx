import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  HeartPulse,
  ListChecks,
  Megaphone,
  PanelLeft,
  Search,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { canAccess } from "../../app/access";
import AdminNotificationDropdown from "./AdminNotificationDropdown";

const DESKTOP = "(min-width: 1024px)";

function resolveRouteMeta(pathname, expertType) {
  const patientsLabel = expertType === "Cardiologist" ? "Cardiologist dashboard" : "Patients";

  if (pathname === "/dashboard") {
    return { section: "Overview", title: "Dashboard" };
  }
  if (pathname === "/analytics") {
    return { section: "Overview", title: "Analytics" };
  }
  if (pathname === "/cases") {
    return { section: "Clinical & Library", title: "Case Review" };
  }
  if (pathname.startsWith("/cases/")) {
    return { section: "Case Review", sectionPath: "/cases", title: "Evaluation Detail" };
  }
  if (pathname === "/calibration") {
    return { section: "Clinical & Library", title: "Model Check" };
  }
  if (pathname === "/patients") {
    return { section: "Care Team", title: patientsLabel };
  }
  // HL-039: a patient page's last segment is the patient's id, which must never be shown
  if (pathname.startsWith("/patients/")) {
    return { section: patientsLabel, sectionPath: "/patients", title: "Patient Record" };
  }
  if (pathname === "/foods") {
    return { section: "Clinical & Library", title: "Food & Recipes" };
  }
  if (pathname === "/exercises") {
    return { section: "Clinical & Library", title: "Exercise Library" };
  }
  if (pathname === "/users") {
    return { section: "Administration", title: "Users" };
  }
  if (pathname.startsWith("/users/")) {
    return { section: "Users", sectionPath: "/users", title: "Wellness Profile" };
  }
  if (pathname === "/feedbacks") {
    return { section: "Support", title: "Get Help" };
  }
  if (pathname === "/premium") {
    return { section: "Governance", title: "Premium" };
  }
  if (pathname === "/broadcasts") {
    return { section: "Governance", title: "Announcements" };
  }
  if (pathname === "/activity-log") {
    return { section: "Governance", title: "Activity Log" };
  }
  if (pathname === "/notifications") {
    return { section: "Inbox", title: "Notifications" };
  }
  if (pathname === "/settings") {
    return { section: "System", title: "Settings" };
  }

  const fallbackSegment = pathname.split("/").filter(Boolean).pop() || "dashboard";
  const fallbackTitle = fallbackSegment
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return { section: "Portal", title: fallbackTitle };
}

export default function Header({
  setSidebarOpen,
  collapsed,
  setCollapsed,
  title: propTitle,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userId } = useAuth();

  const [qaState, setQaState] = useState({ open: false, path: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const qaMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  const userRole = user?.role;
  const expertType = user?.expert_type;
  const routeMeta = resolveRouteMeta(location.pathname, expertType);
  const title = propTitle || routeMeta.title;
  const quickActionsOpen = qaState.open && qaState.path === location.pathname;

  // Live Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard accessibility & click outside for Quick Actions
  useEffect(() => {
    if (!quickActionsOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setQaState({ open: false, path: "" });
      }
    }
    function handleClickOutside(event) {
      if (qaMenuRef.current && !qaMenuRef.current.contains(event.target)) {
        setQaState({ open: false, path: "" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [quickActionsOpen]);

  // Press "/" anywhere outside text inputs to focus the header search bar
  useEffect(() => {
    function handleSlashFocus(event) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      const tag = active?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        active?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener("keydown", handleSlashFocus);
    return () => window.removeEventListener("keydown", handleSlashFocus);
  }, []);

  const handleSidebarToggle = () => {
    const isDesktop = window.matchMedia(DESKTOP).matches;
    if (isDesktop && setCollapsed) {
      setCollapsed((prev) => !prev);
    } else if (setSidebarOpen) {
      setSidebarOpen(true);
    }
  };

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return;
      if (userRole === "medical_expert") {
        // HL-081: experts see patients by reference only (names are hidden), and cases by their code
        const target = /^case/i.test(trimmedQuery) ? "/cases" : "/patients";
        navigate(`${target}?search=${encodeURIComponent(trimmedQuery)}`);
      } else {
        navigate(`/users?search=${encodeURIComponent(trimmedQuery)}`);
      }
      setSearchQuery("");
      searchInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setSearchQuery("");
      searchInputRef.current?.blur();
    }
  };

  const searchPlaceholder =
    userRole === "medical_expert"
      ? "Find patient (USR-…) or case (CASE-…)"
      : "Search profiles or content…";

  const actionItems =
    userRole === "admin"
      ? [
        { label: "Send announcement", path: "/broadcasts", icon: Megaphone },
        { label: "Provision staff account", path: "/users", icon: UserPlus },
      ]
      : [
        canAccess(user, "/patients") && {
          label: expertType === "Cardiologist" ? "Cardiologist roster" : "Patient roster",
          path: "/patients",
          icon: HeartPulse,
        },
        canAccess(user, "/cases") && {
          label: "Review HSS cases",
          path: "/cases",
          icon: ListChecks,
        },
        canAccess(user, "/calibration") && {
          label: "Run model check",
          path: "/calibration",
          icon: Database,
        },
      ].filter(Boolean);

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-[60px] shrink-0 items-center justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-4 sm:px-6 font-cal-sans text-cal-ink select-none">
      {/* ─── Left: Sidebar Trigger + Hairline Divider + Breadcrumb Title ──── */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={handleSidebarToggle}
          aria-label={collapsed ? "Expand sidebar" : "Toggle sidebar"}
          title={collapsed ? "Expand sidebar" : "Toggle sidebar"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink active:scale-95 transition-all duration-200 cursor-pointer ${setCollapsed ? "" : "lg:hidden"
            }`}
        >
          <PanelLeft
            size={16}
            strokeWidth={1.9}
            className={`transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              collapsed ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        <div className="h-4 w-px shrink-0 bg-cal-hairline" aria-hidden="true" />

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
          {routeMeta.section && (
            <>
              {routeMeta.sectionPath ? (
                <Link
                  to={routeMeta.sectionPath}
                  className="hidden md:inline truncate text-[13.5px] font-medium text-cal-muted hover:text-cal-ink transition-colors"
                >
                  {routeMeta.section}
                </Link>
              ) : (
                <span className="hidden md:inline truncate text-[13.5px] font-medium text-cal-muted">
                  {routeMeta.section}
                </span>
              )}
              <ChevronRight
                size={14}
                className="hidden md:inline shrink-0 text-cal-muted-soft"
                aria-hidden="true"
              />
            </>
          )}
          <h1 className="truncate text-[14px] font-semibold leading-tight text-cal-ink">
            {title}
          </h1>
        </nav>
      </div>

      {/* ─── Right Cluster: Search Input, Monospace Clock, Actions & Bell ─── */}
      <div className="flex items-center justify-end gap-2.5">
        {/* Cal.com Hairline Search Input */}
        <div className="group flex h-9 w-[170px] sm:w-[240px] lg:w-[290px] items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3 transition-colors focus-within:border-cal-ink focus-within:bg-cal-canvas">
          <Search
            size={14}
            className="shrink-0 text-cal-muted group-focus-within:text-cal-ink transition-colors"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            aria-label={searchPlaceholder}
            className="h-full w-full bg-transparent text-[13px] font-normal text-cal-ink placeholder:text-cal-muted outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-cal-muted hover:text-cal-ink cursor-pointer"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex h-5 shrink-0 items-center justify-center rounded-[4px] border border-cal-hairline bg-cal-canvas px-1.5 font-cal-mono text-[11px] font-medium text-cal-muted">
              /
            </kbd>
          )}
        </div>

        {/* Live Tabular Clock Widget (JetBrains Mono) */}
        <div
          className="hidden xl:flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3 text-[12px] text-cal-muted"
          title="Portal server local time"
        >
          <Clock size={13.5} className="shrink-0 text-cal-muted" />
          <span className="font-cal-mono font-medium text-cal-ink tabular-nums">
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>

        {/* Quick Actions Dropdown (Cal.com Secondary Button + 12px Popover) */}
        <div className="relative hidden md:block" ref={qaMenuRef}>
          <button
            type="button"
            onClick={() =>
              setQaState((prev) => ({
                open: !(prev.open && prev.path === location.pathname),
                path: location.pathname,
              }))
            }
            aria-expanded={quickActionsOpen}
            aria-haspopup="menu"
            aria-label="Quick actions"
            className={`flex h-9 items-center gap-1.5 rounded-[8px] border bg-cal-canvas px-3 text-[13.5px] font-semibold text-cal-ink transition-colors cursor-pointer ${quickActionsOpen
                ? "border-cal-ink bg-cal-surface-soft"
                : "border-cal-hairline hover:bg-cal-surface-soft"
              }`}
          >
            <Zap size={13.5} strokeWidth={2} className="text-cal-ink" />
            <span>Actions</span>
            <ChevronDown
              size={13}
              strokeWidth={2}
              className={`text-cal-muted transition-transform duration-150 ${quickActionsOpen ? "rotate-180" : "rotate-0"
                }`}
            />
          </button>

          {quickActionsOpen && (
            <div
              role="menu"
              aria-label="Quick actions menu"
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-[224px] rounded-[12px] border border-cal-hairline bg-cal-canvas p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            >
              <div className="px-2.5 py-1.5 text-[11.5px] font-medium text-cal-muted">
                {userRole === "admin" ? "System actions" : "Clinical actions"}
              </div>
              <div className="space-y-0.5">
                {actionItems.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.path + item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setQaState({ open: false, path: "" });
                        navigate(item.path);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                    >
                      <ItemIcon size={15} className="shrink-0 text-cal-muted" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell (HL-082: medical experts have their own bell) */}
        {(userRole === "admin" || userRole === "medical_expert") && (
          <AdminNotificationDropdown userId={userId || user?.id} />
        )}
      </div>
    </header>
  );
}
