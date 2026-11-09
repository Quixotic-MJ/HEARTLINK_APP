import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./sidebar.jsx";
import Header from "./header.jsx";
import LogoutConfirmModal from "../../features/auth/components/logoutConfirmModal.jsx";
import { useAuth } from "../../contexts/useAuth.js";
import { canAccess, homeFor } from "../../app/access.js";
import PortalSearchModal from "../../features/search/portalSearchModal.jsx";
import WorkspaceCalendar from "../ui/workspaceCalendar.jsx";
import "../../features/overview/home.css";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, userId, isAuthenticated } = useAuth();
  const isExpertHome = user?.role === "medical_expert" && pathname === homeFor(user);

  React.useEffect(() => {
    const shortcut = (event) => {
      if (
        event.defaultPrevented ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k"
      )
        return;
      if (
        !searchOpen &&
        document.querySelector('[role="dialog"][aria-modal="true"]')
      )
        return;
      event.preventDefault();
      setSearchOpen((open) => !open);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [searchOpen]);

  React.useEffect(() => {
    // Wait until authenticated to avoid premature redirects
    if (!isAuthenticated) return;

    const role = user?.role;

    // HL-034: same page rules as the routes (app/access.js), including expert type
    if (!canAccess(user, pathname)) {
      navigate(homeFor(user), { replace: true });
    } else if (role === "admin") {
      // Admins should not access the individual user profile directly, they use the user detail drawer
      const isUserProfile =
        pathname.startsWith("/users/") && pathname.length > "/users/".length;
      if (isUserProfile) {
        navigate("/users", { replace: true });
      }
    }
  }, [pathname, user, userId, isAuthenticated, navigate]);

  return (
    <div
      data-workspace={
        pathname === "/foods"
          ? "recipes"
          : pathname === "/exercises"
            ? "exercises"
            : "operations"
      }
      className="portal-shell fixed inset-0 flex h-screen w-full overflow-hidden bg-cal-canvas font-cal-sans text-cal-ink selection:bg-cal-primary selection:text-cal-on-primary"
    >
      {/* Sidebar Component */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Column Area */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-cal-canvas">
        {/* Header Component */}
        <Header
          setSidebarOpen={setSidebarOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onSearch={() => setSearchOpen(true)}
          searchOpen={searchOpen}
        />

        {/* Scrollable Content Wrapper */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-cal-surface-soft p-5 sm:p-6 lg:p-8">
          {/*
            FIX: Removed max-w-[1180px] to allow child components (like the Dashboard)
            to utilize fluid, wide-screen grid layouts.
          */}
          <div key={pathname} className={`portal-page-enter mx-auto w-full pb-10 ${isExpertHome ? "expert-home" : ""}`}>
            {isExpertHome && (
              <div className="expert-home-intro">
                <section className="expert-home-welcome" aria-labelledby="expert-welcome-heading">
                  <span>{user.expert_type} workspace</span>
                  <h1 id="expert-welcome-heading">Welcome back{user.first_name ? `, ${user.first_name}` : ""}.</h1>
                  <p>{user.expert_type === "Dietitian"
                    ? "Review recipe details and nutrition information in the saved revision. Your content review helps keep the library clear and useful."
                    : user.expert_type === "Physical Therapist"
                      ? "Review movement instructions and the complete routine timeline. Keep feedback connected to the saved revision."
                      : "Keep up with content, account and security notices assigned to your workspace."}</p>
                  <p className="expert-home-purpose">{user.expert_type === "Cardiologist" ? "Your notices are below." : "Your review library is below."}</p>
                </section>
                <WorkspaceCalendar />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {searchOpen && (
        <PortalSearchModal user={user} onClose={() => setSearchOpen(false)} />
      )}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
};

export default AdminLayout;
