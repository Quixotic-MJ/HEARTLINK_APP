import { ChevronRight, PanelLeft, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth.js";
import { portalNavigationFor } from "../../app/portalNavigation.js";
import AdminNotificationDropdown from "../../features/notifications/components/adminNotificationDropdown.jsx";

export default function Header({
  setSidebarOpen,
  collapsed,
  setCollapsed,
  onSearch,
  searchOpen,
  title: propTitle,
}) {
  const { pathname } = useLocation();
  const { user, userId } = useAuth();
  const page = portalNavigationFor(user).find(
    (item) =>
      item.path === pathname ||
      (item.path === "/users" && pathname.startsWith("/users/")),
  );
  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 1024px)").matches && setCollapsed)
      setCollapsed((previous) => !previous);
    else setSidebarOpen?.(true);
  };
  return (
    <header className="portal-header font-cal-sans">
      <div className="portal-header-location">
        <button
          type="button"
          className="portal-icon-button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Toggle sidebar"}
          title={collapsed ? "Expand sidebar" : "Toggle sidebar"}
        >
          <PanelLeft size={18} strokeWidth={1.7} aria-hidden="true" />
        </button>
        <nav aria-label="Breadcrumb">
          {page && (
            <>
              <span className="portal-breadcrumb-section">{page.section}</span>
              <ChevronRight
                className="portal-breadcrumb-section"
                size={14}
                aria-hidden="true"
              />
            </>
          )}
          <h1>{propTitle || page?.label || "HeartLink"}</h1>
        </nav>
      </div>
      <div className="portal-header-tools">
        <button
          type="button"
          className="portal-global-search"
          aria-label="Search portal"
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          onClick={onSearch}
        >
          <Search size={17} aria-hidden="true" />
          <span>Search portal…</span>
          <kbd>Ctrl K</kbd>
        </button>
        {(user?.role === "admin" || user?.role === "medical_expert") && (
          <AdminNotificationDropdown userId={userId || user?.id} />
        )}
      </div>
    </header>
  );
}
