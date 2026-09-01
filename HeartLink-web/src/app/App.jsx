import { BrowserRouter, Routes, Route } from "react-router-dom";
import Settings from "../features/pages/system & support/settings";
import Broadcasts from "../features/pages/system & support/system_broadcast";
import Feedbacks from "../features/pages/system & support/feedback_reports";
import Users from "../features/pages/system & support/user_management";
import Calibrations from "../features/pages/clinical portal/calibration_history";
import Cases from "../features/pages/clinical portal/case_review";
import Exercises from "../features/pages/management/exercise";
import Foods from "../features/pages/management/food";
import Analytics from "../features/pages/overview/analytics";
import Dashboard from "../features/pages/overview/dashboard";
import Login from "../features/auth/login";
import UserWellnessProfile from "../features/pages/system & support/UserWellnessProfile";
import ActivityLog from "../features/pages/system & support/ActivityLog";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const role = user?.role;
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Medical Expert redirected to their clinical portal home
    if (role === "medical_expert") {
      return <Navigate to="/cases" replace />;
    }
    // Admin / Super Admin redirected to administrative dashboard
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const ADMIN_ROLES = ["admin", "super_admin"];
const CLINICAL_ROLES = ["medical_expert", "admin", "super_admin"];

import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" expand={false} richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/two-factor" element={<Navigate to="/" replace />} />
          
          {/* Administrative Routes */}
          <Route path="/dashboard" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Dashboard /></RoleRoute>} />
          <Route path="/analytics" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Analytics /></RoleRoute>} />
          <Route path="/foods" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Foods /></RoleRoute>} />
          <Route path="/exercises" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Exercises /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Users /></RoleRoute>} />
          <Route path="/users/:id" element={<RoleRoute allowedRoles={ADMIN_ROLES}><UserWellnessProfile /></RoleRoute>} />
          <Route path="/feedbacks" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Feedbacks /></RoleRoute>} />
          <Route path="/broadcasts" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Broadcasts /></RoleRoute>} />
          <Route path="/settings" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Settings /></RoleRoute>} />
          <Route path="/activity-log" element={<RoleRoute allowedRoles={ADMIN_ROLES}><ActivityLog /></RoleRoute>} />
          
          {/* Clinical Routes */}
          <Route path="/cases" element={<RoleRoute allowedRoles={CLINICAL_ROLES}><Cases /></RoleRoute>} />
          <Route path="/calibration" element={<RoleRoute allowedRoles={CLINICAL_ROLES}><Calibrations /></RoleRoute>} />
          
          {/* Catch-all route to redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
