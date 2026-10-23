import { BrowserRouter, Routes, Route } from "react-router-dom";
import Settings from "../features/pages/system & support/settings";
import Broadcasts from "../features/pages/system & support/system_broadcast";
import Feedbacks from "../features/pages/system & support/feedback_reports";
import Users from "../features/pages/system & support/user_management";
import Notifications from "../features/pages/system & support/notifications";
import Calibrations from "../features/pages/clinical portal/calibration_history";
import Cases from "../features/pages/clinical portal/case_review";
import CaseReviewDetail from "../features/pages/clinical portal/case_review_detail";
import Patients from "../features/pages/care team/patients";
import PatientDetail from "../features/pages/care team/patient_detail";
import Exercises from "../features/pages/management/exercise";
import Foods from "../features/pages/management/food";
import Analytics from "../features/pages/overview/analytics";
import Dashboard from "../features/pages/overview/dashboard";
import Login from "../features/auth/login";
import SetPassword from "../features/auth/set_password";
import UserWellnessProfile from "../features/pages/system & support/UserWellnessProfile";
import ActivityLog from "../features/pages/system & support/ActivityLog";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { AuthProvider } from "../contexts/AuthContext";
import { useAuth } from "../contexts/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { canAccess, homeFor } from "./access";

// HL-034: every page is checked against the shared rules in access.js (role and expert type).
const RoleRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { pathname } = useLocation();

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

  if (!canAccess(user, pathname)) {
    toast.error("You don't have access to that page", { id: "no-access" });
    return <Navigate to={homeFor(user)} replace />;
  }

  return children;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster position="top-right" expand={false} richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/two-factor" element={<Navigate to="/" replace />} />
          <Route path="/set-password" element={<SetPassword />} />
          
          {/* Administrative & Shared Routes */}
          <Route path="/dashboard" element={<RoleRoute><Dashboard /></RoleRoute>} />
          <Route path="/analytics" element={<RoleRoute><Analytics /></RoleRoute>} />
          <Route path="/foods" element={<RoleRoute><Foods /></RoleRoute>} />
          <Route path="/exercises" element={<RoleRoute><Exercises /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute><Users /></RoleRoute>} />
          <Route path="/users/:id" element={<RoleRoute><UserWellnessProfile /></RoleRoute>} />
          <Route path="/feedbacks" element={<RoleRoute><Feedbacks /></RoleRoute>} />
          <Route path="/broadcasts" element={<RoleRoute><Broadcasts /></RoleRoute>} />
          <Route path="/notifications" element={<RoleRoute><Notifications /></RoleRoute>} />
          <Route path="/settings" element={<RoleRoute><Settings /></RoleRoute>} />
          <Route path="/activity-log" element={<RoleRoute><ActivityLog /></RoleRoute>} />
          
          {/* Clinical Routes */}
          <Route path="/cases" element={<RoleRoute><Cases /></RoleRoute>} />
          <Route path="/cases/:roundId" element={<RoleRoute><CaseReviewDetail /></RoleRoute>} />
          <Route path="/calibration" element={<RoleRoute><Calibrations /></RoleRoute>} />

          {/* Care team (HL-039 / HL-040) */}
          <Route path="/patients" element={<RoleRoute><Patients /></RoleRoute>} />
          <Route path="/patients/:id" element={<RoleRoute><PatientDetail /></RoleRoute>} />
          
          {/* Catch-all route to redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
  );
}
