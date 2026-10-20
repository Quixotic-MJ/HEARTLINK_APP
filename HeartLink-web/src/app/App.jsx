import { BrowserRouter, Routes, Route } from "react-router-dom";
import Settings from "../features/pages/system & support/settings";
import Broadcasts from "../features/pages/system & support/system_broadcast";
import Feedbacks from "../features/pages/system & support/feedback_reports";
import Users from "../features/pages/system & support/user_management";
import Notifications from "../features/pages/system & support/notifications";
import Calibrations from "../features/pages/clinical portal/calibration_history";
import Cases from "../features/pages/clinical portal/case_review";
import Exercises from "../features/pages/management/exercise";
import Foods from "../features/pages/management/food";
import Analytics from "../features/pages/overview/analytics";
import Dashboard from "../features/pages/overview/dashboard";
import Login from "../features/auth/login";
import SetPassword from "../features/auth/set_password";
import UserWellnessProfile from "../features/pages/system & support/UserWellnessProfile";
import ActivityLog from "../features/pages/system & support/ActivityLog";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { staffHome } from "../utils/staffHome";

const RoleRoute = ({ children, allowedRoles = [], allowedExpertTypes = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // HL-044: a temporary password must be replaced before any page can be used
  if (user?.mustChangePassword) {
    return <Navigate to="/set-password" replace />;
  }

  const role = user?.role;
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={staffHome(user)} replace />;
  }

  if (role === "medical_expert" && allowedExpertTypes.length > 0 && !allowedExpertTypes.includes(user?.expertType)) {
    return <Navigate to={staffHome(user)} replace />;
  }
  
  return children;
};

const ADMIN_ROLES = ["admin", "super_admin"];
const CLINICAL_ROLES = ["medical_expert", "admin", "super_admin"];
const CONTENT_ROLES = ["medical_expert", "admin", "super_admin"];

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
          <Route path="/set-password" element={<SetPassword />} />
          
          {/* Administrative & Shared Routes */}
          <Route path="/dashboard" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Dashboard /></RoleRoute>} />
          <Route path="/analytics" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Analytics /></RoleRoute>} />
          <Route path="/foods" element={<RoleRoute allowedRoles={CONTENT_ROLES} allowedExpertTypes={["Dietitian", "Cardiologist"]}><Foods /></RoleRoute>} />
          <Route path="/exercises" element={<RoleRoute allowedRoles={CONTENT_ROLES} allowedExpertTypes={["Physical Therapist", "Cardiologist"]}><Exercises /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Users /></RoleRoute>} />
          <Route path="/users/:id" element={<RoleRoute allowedRoles={ADMIN_ROLES}><UserWellnessProfile /></RoleRoute>} />
          <Route path="/feedbacks" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Feedbacks /></RoleRoute>} />
          <Route path="/broadcasts" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Broadcasts /></RoleRoute>} />
          <Route path="/notifications" element={<RoleRoute allowedRoles={CLINICAL_ROLES}><Notifications /></RoleRoute>} />
          <Route path="/settings" element={<RoleRoute allowedRoles={ADMIN_ROLES}><Settings /></RoleRoute>} />
          <Route path="/activity-log" element={<RoleRoute allowedRoles={ADMIN_ROLES}><ActivityLog /></RoleRoute>} />
          
          {/* Clinical Routes */}
          <Route path="/cases" element={<RoleRoute allowedRoles={CLINICAL_ROLES} allowedExpertTypes={["Cardiologist"]}><Cases /></RoleRoute>} />
          <Route path="/calibration" element={<RoleRoute allowedRoles={CLINICAL_ROLES} allowedExpertTypes={["Cardiologist"]}><Calibrations /></RoleRoute>} />
          
          {/* Catch-all route to redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
