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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/two-factor" element={<TwoFactorAuth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/foods" element={<Foods />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/calibration" element={<Calibrations />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/users" element={<Users />} />
        <Route path="/feedbacks" element={<Feedbacks />} />
        <Route path="/broadcasts" element={<Broadcasts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/activity-log" element={<ActivityLog />} />
      </Routes>
    </BrowserRouter>
  );
}
