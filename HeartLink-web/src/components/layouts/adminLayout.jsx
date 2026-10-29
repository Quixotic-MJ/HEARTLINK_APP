import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./sidebar";
import Header from "./header";
import LogoutConfirmModal from "../modals/LogoutConfirmModal";
import { useAuth } from "../../contexts/useAuth";
import { canAccess, homeFor } from "../../app/access";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, userId, isAuthenticated } = useAuth();

  React.useEffect(() => {
    // Wait until authenticated to avoid premature redirects
    if (!isAuthenticated) return;

    const role = user?.role;

    // HL-034: same page rules as the routes (app/access.js), including expert type
    if (!canAccess(user, pathname)) {
      navigate(homeFor(user), { replace: true });
    } else if (role === "admin") {
      // Admins should not access the individual user profile directly, they use the user detail drawer
      const isUserProfile = pathname.startsWith("/users/") && pathname.length > "/users/".length;
      if (isUserProfile) {
        navigate("/users", { replace: true });
      }
    }
  }, [pathname, user, userId, isAuthenticated, navigate]);

  return (
    <div className="fixed inset-0 flex h-screen w-full overflow-hidden bg-cal-canvas font-cal-sans text-cal-ink selection:bg-cal-primary selection:text-cal-on-primary">
      {/* Sidebar Component */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Column Area */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-cal-canvas">
        {/* Header Component */}
        <Header
          setSidebarOpen={setSidebarOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
        />

        {/* Scrollable Content Wrapper */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-cal-surface-soft p-5 sm:p-6 lg:p-8">
          {/*
            FIX: Removed max-w-[1180px] to allow child components (like the Dashboard)
            to utilize fluid, wide-screen grid layouts.
          */}
          <div className="mx-auto w-full pb-10">{children}</div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
};

export default AdminLayout;
