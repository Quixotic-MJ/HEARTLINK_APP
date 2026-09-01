import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/layouts/sidebar"; // Adjust path based on your structure
import Header from "../../components/layouts/header"; // Adjust path based on your structure
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
      // Admins should not access the individual user profile, they use the quick-action modal
      const isUserProfile = pathname.startsWith("/users/") && pathname.length > "/users/".length;
      if (isUserProfile) {
        navigate("/users", { replace: true });
      }
    }
  }, [pathname, user, userId, isAuthenticated, navigate]);

  return (
    <div className="flex h-screen w-full bg-[#13121F] font-sans text-white selection:bg-[#E55F37] selection:text-white overflow-hidden fixed inset-0">
      {/* Sidebar Component */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative bg-[#161616] border-l border-white/10 rounded-none">
        {/* Header Component */}
        <Header
          setSidebarOpen={setSidebarOpen}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
        />

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 custom-scrollbar bg-[#161616]">
          <div className="max-w-7xl mx-auto pb-10">{children}</div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
};

export default AdminLayout;
