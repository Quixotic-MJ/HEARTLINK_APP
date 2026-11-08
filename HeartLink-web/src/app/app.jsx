import { BrowserRouter, Routes, Route } from "react-router-dom";
import Settings from "../features/settings/settingsPage.jsx";
import Broadcasts from "../features/broadcasts/broadcastsPage.jsx";
import Feedbacks from "../features/support/supportPage.jsx";
import Users from "../features/accounts/accountsPage.jsx";
import Notifications from "../features/notifications/notificationsPage.jsx";
import Exercises from "../features/exercises/exercisesPage.jsx";
import Foods from "../features/recipes/recipesPage.jsx";
import Analytics from "../features/overview/analyticsPage.jsx";
import Dashboard from "../features/overview/dashboardPage.jsx";
import Login from "../features/auth/login.jsx";
import Landing from "../features/landing/landing.jsx";
import SetPassword from "../features/auth/setPassword.jsx";
import ActivityLog from "../features/activity/activityPage.jsx";
import Premium from "../features/premium/premiumPage.jsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient.js";
import { AuthProvider } from "../contexts/authProvider.jsx";
import { useAuth } from "../contexts/useAuth.js";
import { Navigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { canAccess, homeFor } from "./access.js";
import { MotionConfig } from "framer-motion";

// HL-034: every page is checked against the shared rules in access.js (role and expert type).
const RoleRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
      <MotionConfig reducedMotion="user">
      <Toaster
        style={{ zIndex: 45 }}
        position="top-right"
        expand={false}
        closeButton
        duration={4200}
        offset={18}
        gap={8}
        toastOptions={{
          className:
            "group font-cal-sans rounded-[10px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-3 px-3.5 flex items-start gap-3 select-none",
          classNames: {
            title:
              "font-cal-sans text-[13.5px] font-semibold text-cal-ink leading-tight",
            description:
              "text-[12.5px] text-cal-muted leading-relaxed mt-0.5",
            actionButton:
              "rounded-[6px] bg-cal-primary active:bg-cal-primary-active text-cal-on-primary font-semibold text-[12px] px-3 py-1.5 transition-colors cursor-pointer",
            cancelButton:
              "rounded-[6px] border border-cal-hairline bg-cal-canvas text-cal-ink font-semibold text-[12px] px-3 py-1.5 hover:bg-cal-surface-soft transition-colors cursor-pointer",
            closeButton:
              "border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink hover:bg-cal-surface-soft transition-colors",
            success: "!border-cal-hairline !bg-cal-canvas !text-cal-ink",
            error: "!border-cal-error/30 !bg-cal-canvas !text-cal-ink",
            warning: "!border-cal-warning/40 !bg-cal-canvas !text-cal-ink",
            info: "!border-cal-brand-accent/30 !bg-cal-canvas !text-cal-ink",
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* The public home page; staff sign in at /login */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/two-factor" element={<Navigate to="/login" replace />} />
          <Route path="/set-password" element={<SetPassword />} />
          
          {/* Administrative & Shared Routes */}
          <Route path="/dashboard" element={<RoleRoute><Dashboard /></RoleRoute>} />
          <Route path="/analytics" element={<RoleRoute><Analytics /></RoleRoute>} />
          <Route path="/foods" element={<RoleRoute><Foods /></RoleRoute>} />
          <Route path="/exercises" element={<RoleRoute><Exercises /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute><Users /></RoleRoute>} />
          <Route path="/users/:id" element={<RoleRoute><Navigate to="/users" replace /></RoleRoute>} />
          <Route path="/feedbacks" element={<RoleRoute><Feedbacks /></RoleRoute>} />
          <Route path="/premium" element={<RoleRoute><Premium /></RoleRoute>} />
          <Route path="/broadcasts" element={<RoleRoute><Broadcasts /></RoleRoute>} />
          <Route path="/notifications" element={<RoleRoute><Notifications /></RoleRoute>} />
          <Route path="/settings" element={<RoleRoute><Settings /></RoleRoute>} />
          <Route path="/activity-log" element={<RoleRoute><ActivityLog /></RoleRoute>} />
          
          {/* Retired bookmarks pass through auth/access and return to the staff role home. */}
          <Route path="/cases/*" element={<RoleRoute><Navigate to="/" replace /></RoleRoute>} />
          <Route path="/calibration/*" element={<RoleRoute><Navigate to="/" replace /></RoleRoute>} />
          <Route path="/patients/*" element={<RoleRoute><Navigate to="/" replace /></RoleRoute>} />
          
          {/* Unknown paths go to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </MotionConfig>
    </AuthProvider>
    </QueryClientProvider>
  );
}
