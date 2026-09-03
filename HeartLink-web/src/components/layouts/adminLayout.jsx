import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./sidebar";
import Header from "./header";
import LogoutConfirmModal from "../modals/LogoutConfirmModal";
import { useAuth } from "../../contexts/AuthContext";

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
    
    if (role === "medical_expert") {
      const restrictedRoutes = ["/analytics", "/foods", "/exercises", "/feedbacks", "/broadcasts", "/settings"];
      const isRestricted = restrictedRoutes.some(route => pathname.startsWith(route)) || pathname === "/users" || pathname === "/users/";
      if (isRestricted) {
        navigate("/dashboard", { replace: true });
      }
    } else if (role === "admin" || role === "super_admin") {
      // Admins should not access the individual user profile directly, they use the user detail drawer
      const isUserProfile = pathname.startsWith("/users/") && pathname.length > "/users/".length;
      if (isUserProfile) {
        navigate("/users", { replace: true });
      }
    }
  }, [pathname, user, userId, isAuthenticated, navigate]);

  return (
    <div 
      className="flex h-screen w-full bg-[#EDF1EF] text-[#152131] selection:bg-[#E8532E] selection:text-white overflow-hidden fixed inset-0"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Sidebar Component */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Column Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative bg-[#EDF1EF]">
        {/* Header Component */}
        <Header
          setSidebarOpen={setSidebarOpen}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
        />

        {/* Scrollable Content Wrapper */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6 lg:p-8 bg-[#EDF1EF]">
          <div className="max-w-[1180px] mx-auto pb-10">{children}</div>
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
