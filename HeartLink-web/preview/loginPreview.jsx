import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthContext } from "../src/contexts/useAuth.js";
import Login from "../src/features/auth/login.jsx";
import "../src/styles/app.css";

// Uses the real presentation, but no AuthProvider/session boot or enabled credential fields.
export default function LoginPreview() {
  const location = useLocation();
  React.useEffect(() => {
    if (location.pathname !== "/__preview/login") window.location.assign(location.pathname + location.search);
  }, [location.pathname, location.search]);
  if (location.pathname !== "/__preview/login") return null;
  return (
    <AuthContext.Provider value={{ user: null, isAuthenticated: false, loading: false, login: () => { throw Error("Design preview cannot sign in"); } }}>
      <p className="login-preview-notice">Read-only sign-in design preview. Fields are disabled; do not enter credentials.</p>
      <fieldset disabled aria-label="Disabled sign-in design preview" style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}><Login /></fieldset>
    </AuthContext.Provider>
  );
}

createRoot(document.getElementById("root")).render(<BrowserRouter><LoginPreview /></BrowserRouter>);
