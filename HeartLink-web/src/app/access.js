// HL-034: which portal pages each staff member can open. The routes (App.jsx), the layout
// and the side menu all read these rules, so they can't disagree. They mirror the backend's
// HL-012 rules (backend/app/utils/security.py EXPERT_PERMISSIONS): Admins author recipes,
// Dietitians review recipes; routine author/review parity is tracked separately.

// HL-074: one Admin role; Super Admin was merged into it.
export const ADMIN_ROLES = ["admin"];

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
  // HL-084: Premium settings and members
  "/premium": ADMINS,
  "/broadcasts": ADMINS,
  // Experts use notifications for content, account, and security work assigned to them.
  "/notifications": ALL_STAFF,
  // Own account/password only; this does not grant system or staff management.
  "/settings": ALL_STAFF,
  "/activity-log": ADMINS,
};

/** The rule for a path, matching "/users/123" to "/users". */
export function ruleFor(pathname) {
  const path = pathname.replace(/\/$/, "");
  const key = Object.hasOwn(PAGE_ACCESS, path) ? path : /^\/users\/[^/]+$/.test(path) ? "/users" : null;
  return key ? PAGE_ACCESS[key] : null;
}

export function canAccess(user, pathname) {
  const rule = ruleFor(pathname);
  if (!rule) return false;
  const role = user?.role;
  if (rule.roles.includes(role)) return true;
  return role === "medical_expert" && !!rule.expertTypes?.includes(user?.expert_type);
}

export function searchPathFor(user) {
  if (ADMIN_ROLES.includes(user?.role)) return "/users";
  if (user?.role !== "medical_expert") return null;
  if (user?.expert_type === "Dietitian") return "/foods";
  if (user?.expert_type === "Physical Therapist") return "/exercises";
  return null;
}

export function safeNotificationRoute(user, route) {
  if (typeof route !== "string" || !route.startsWith("/") || route.startsWith("//")) return null;
  try {
    const origin = "https://portal.heartlink.invalid";
    const parsed = new URL(route, origin);
    if (parsed.origin !== origin || !ruleFor(parsed.pathname) || !canAccess(user, parsed.pathname)) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function canAuthorRecipes(user) {
  return ADMIN_ROLES.includes(user?.role);
}

export function canReviewRecipes(user) {
  return user?.role === "medical_expert" && user?.expert_type === "Dietitian";
}

/** Where someone lands after being turned away from a page. */
export function homeFor(user) {
  if (ADMIN_ROLES.includes(user?.role)) return "/dashboard";
  if (user?.role !== "medical_expert") return "/";
  if (user?.expert_type === "Dietitian") return "/foods";
  if (user?.expert_type === "Physical Therapist") return "/exercises";
  return "/notifications";
}
