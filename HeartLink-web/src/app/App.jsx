import { BrowserRouter, Routes, Route } from "react-router-dom";
import Settings from "../features/pages/system & support/settings";
import Broadcasts from "../features/pages/system & support/system_broadcast";
import Feedbacks from "../features/pages/system & support/feedback_reports";
import Users from "../features/pages/system & support/user_management";
import Alerts from "../features/pages/clinical portal/alert_monitoring";
import Calibrations from "../features/pages/clinical portal/calibration_history";
import Cases from "../features/pages/clinical portal/case_review";
import Exercises from "../features/pages/management/exercise";
import Foods from "../features/pages/management/food";
import Analytics from "../features/pages/overview/analytics";
import Dashboard from "../features/pages/overview/dashboard";
import Login from "../features/auth/login";
import TwoFactorAuth from "../features/auth/two-factor";
import ActivityLog from "../features/pages/system & support/ActivityLog";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/two-factor" element={<TwoFactorAuth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/foods" element={<ProtectedRoute><Foods /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
          <Route path="/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
          <Route path="/calibration" element={<ProtectedRoute><Calibrations /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/feedbacks" element={<ProtectedRoute><Feedbacks /></ProtectedRoute>} />
          <Route path="/broadcasts" element={<ProtectedRoute><Broadcasts /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
