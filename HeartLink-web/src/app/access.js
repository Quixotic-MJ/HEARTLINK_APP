// HL-034: which portal pages each staff member can open. The routes (App.jsx), the layout
// and the side menu all read these rules, so they can't disagree. They mirror the backend's
// HL-012 rules (backend/app/utils/security.py EXPERT_PERMISSIONS): Dietitians edit recipes,
// Physical Therapists edit exercises, Cardiologists edit neither.

export const ADMIN_ROLES = ["admin", "super_admin"];

const ADMINS = { roles: ADMIN_ROLES };
const ALL_STAFF = { roles: [...ADMIN_ROLES, "medical_expert"] };
export const EXPERT_TYPES = ["Cardiologist", "Dietitian", "Physical Therapist"];

/** Page rules by path. `expertTypes` lets medical experts of those types in as well. */
export const PAGE_ACCESS = {
  "/dashboard": ADMINS,
  "/analytics": ADMINS,
  "/foods": { roles: ADMIN_ROLES, expertTypes: ["Dietitian"] },
  "/exercises": { roles: ADMIN_ROLES, expertTypes: ["Physical Therapist"] },
  "/users": ADMINS,
  "/feedbacks": ADMINS,
  "/broadcasts": ADMINS,
  // The notifications API is admin-only (HL-012), so experts would only see an error here.
  "/notifications": ADMINS,
  "/settings": ADMINS,
  "/activity-log": ADMINS,
  "/cases": ALL_STAFF,
  "/calibration": ALL_STAFF,
  // HL-039/040: the Cardiologist dashboard, and each patient's logs and care-team notes
  "/patients": { roles: ADMIN_ROLES, expertTypes: EXPERT_TYPES },
};

/** The rule for a path, matching "/users/123" to "/users". */
export function ruleFor(pathname) {
  const key = Object.keys(PAGE_ACCESS).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  return key ? PAGE_ACCESS[key] : null;
}

export function canAccess(user, pathname) {
  const rule = ruleFor(pathname);
  if (!rule) return true; // pages without a rule (login, set password) are handled elsewhere
  const role = user?.role;
  if (rule.roles.includes(role)) return true;
  return role === "medical_expert" && !!rule.expertTypes?.includes(user?.expert_type);
}

/** Where someone lands after being turned away from a page. */
export function homeFor(user) {
  if (ADMIN_ROLES.includes(user?.role)) return "/dashboard";
  return user?.expert_type === "Cardiologist" ? "/patients" : "/cases";
}
